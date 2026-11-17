import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { scoreLead } from "@/src/lib/leads/score";
import { isPipelineStage, normalizeStage } from "@/src/lib/leads/stages";
import type { LeadRow } from "@/src/lib/leads/types";

// GET /api/projects/[id]/leads?page=1&limit=100&stage=new
//
// Every contact across the project's subscriber lists, with a lead score
// (computed on read), its pipeline stage, where it came from and when it
// was last active. Newest activity first. At most 200 per page.
// Response shape: { leads: LeadRow[], total, page, limit, booking_url }.

type ContactRow = {
  id: string;
  audience_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  whatsapp_opt_in: boolean | null;
  whatsapp_opt_in_at: string | null;
  status: string;
  pipeline_stage: string | null;
  stage_changed_at: string | null;
  lead_source: string | null;
  last_reply_at: string | null;
  subscribed_at: string | null;
  created_at: string;
};

const CONTACT_COLUMNS =
  "id, audience_id, email, first_name, last_name, phone, whatsapp_opt_in, whatsapp_opt_in_at, status, pipeline_stage, stage_changed_at, lead_source, last_reply_at, subscribed_at, created_at";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10) || 100));
  const stageParam = searchParams.get("stage");
  const stage = isPipelineStage(stageParam) ? stageParam : null;

  const { data: audiences, error: aErr } = await supabase.from("audiences").select("id, name").eq("project_id", id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  const audienceIds = (audiences ?? []).map((a: { id: string }) => a.id);
  const audienceNames = new Map<string, string>((audiences ?? []).map((a: { id: string; name: string }) => [a.id, a.name]));

  const project = ctx.project as unknown as { booking_url?: string | null; name: string };
  if (audienceIds.length === 0) {
    return NextResponse.json({ leads: [], total: 0, page, limit, booking_url: project.booking_url ?? null });
  }

  let query = supabase
    .from("audience_contacts")
    .select(CONTACT_COLUMNS, { count: "exact" })
    .in("audience_id", audienceIds)
    .order("created_at", { ascending: false });
  if (stage) query = query.eq("pipeline_stage", stage);
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const contacts = (data ?? []) as ContactRow[];

  // Latest email event per contact (opened, clicked...), one query for the page.
  const lastEvent = new Map<string, string>();
  if (contacts.length > 0) {
    const { data: events } = await supabase
      .from("email_events")
      .select("contact_id, occurred_at")
      .in(
        "contact_id",
        contacts.map((c) => c.id)
      )
      .order("occurred_at", { ascending: false })
      .limit(contacts.length * 5);
    for (const e of (events ?? []) as { contact_id: string | null; occurred_at: string }[]) {
      if (e.contact_id && !lastEvent.has(e.contact_id)) lastEvent.set(e.contact_id, e.occurred_at);
    }
  }

  const leads: LeadRow[] = contacts.map((c) => {
    const { score, reasons, lastActivityAt } = scoreLead({ ...c, lastEventAt: lastEvent.get(c.id) ?? null });
    return {
      id: c.id,
      audience_id: c.audience_id,
      audience_name: audienceNames.get(c.audience_id) ?? null,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      whatsapp_opt_in: c.whatsapp_opt_in === true,
      status: c.status,
      stage: normalizeStage(c.pipeline_stage),
      stage_changed_at: c.stage_changed_at,
      source: c.lead_source,
      last_reply_at: c.last_reply_at,
      last_activity_at: lastActivityAt,
      score,
      score_reasons: reasons,
      created_at: c.created_at,
    };
  });
  leads.sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? "") || b.score - a.score);

  return NextResponse.json({ leads, total: count ?? leads.length, page, limit, booking_url: project.booking_url ?? null });
}
