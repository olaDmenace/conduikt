import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { NAP_MAX_PAGES, runNapCheck, type NapReport } from "@/src/lib/local/nap-check";

// Up to 30 pages, four at a time, 8 seconds each.
export const maxDuration = 120;

type DetailsRow = {
  name: string;
  website_url?: string | null;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  nap_report?: NapReport | null;
  nap_checked_at?: string | null;
};

// GET: the last stored report, or null when none has run.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const project = ctx.project as unknown as DetailsRow;
  return NextResponse.json({ report: project.nap_report ?? null, checked_at: project.nap_checked_at ?? null });
}

// POST: "Check my pages". Crawls the site, compares what it finds with the
// saved details, stores the report on the project and returns it.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, userId } = ctx;
  const project = ctx.project as unknown as DetailsRow;

  const rl = rateLimit(`nap-check:${userId}`, { limit: 5, windowSeconds: 10 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const site = (project.website_url ?? "").trim();
  if (!site) {
    return NextResponse.json({ error: "Add your website address first, then check your details.", code: "NO_WEBSITE" }, { status: 400 });
  }
  if (!project.phone && !project.address_line && !project.city) {
    return NextResponse.json(
      { error: "Save your phone number or address first, then check your details.", code: "NO_DETAILS" },
      { status: 400 }
    );
  }

  let report: NapReport;
  try {
    report = await runNapCheck(
      site,
      { name: project.name, phone: project.phone, address_line: project.address_line, city: project.city },
      { maxPages: NAP_MAX_PAGES }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "We couldn't read your website.";
    return NextResponse.json({ error: `We couldn't read your website: ${message}` }, { status: 502 });
  }

  const { error } = await supabase
    .from("projects")
    .update({ nap_report: report, nap_checked_at: report.checked_at })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ report, checked_at: report.checked_at });
}
