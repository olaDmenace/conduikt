import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import {
  getProjectLimit,
  isUnlimited,
  normalizePlan,
} from "@/src/lib/plans";
import { BUSINESS_TYPES } from "@/src/lib/playbooks";
import { AUTOMATION_MODE_IDS, DEFAULT_AUTOMATION_MODE } from "@/src/lib/automation/mode";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      name,
      website_url,
      description,
      created_at,
      updated_at,
      audits(id, score, type),
      assets(id),
      campaigns(id)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Shape the response to include counts
  const shaped = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    website_url: p.website_url,
    description: p.description,
    created_at: p.created_at,
    updated_at: p.updated_at,
    lastAuditScore:
      p.audits && p.audits.length > 0
        ? p.audits[p.audits.length - 1].score
        : null,
    assetsCount: p.assets?.length ?? 0,
    campaignsCount: p.campaigns?.length ?? 0,
  }));

  return NextResponse.json(shaped);
}

// ── Create ─────────────────────────────────────────────────

/** Optional free text: trimmed, capped, "" becomes null. */
const text = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional()
  );

/** Short list of strings: trimmed, empties dropped, capped. */
const list = (itemMax: number, max: number) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.trim()).map((s: string) => s.trim()) : v),
    z.array(z.string().max(itemMax)).max(max).optional()
  );

/** A website address. "" is none; "example.com" becomes https://example.com. */
const websiteUrl = z.preprocess((v) => {
  if (typeof v !== "string") return v ?? null;
  const s = v.trim();
  if (!s) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
}, z.url({ error: "That doesn't look like a website address" }).max(2048).nullable().optional());

// Not exported: Next.js only allows route handlers as exports from route files.
const CreateProjectSchema = z.object({
  name: z
    .string({ error: "Project name is required" })
    .trim()
    .min(1, "Project name is required")
    .max(120, "Keep the project name under 120 characters"),
  website_url: websiteUrl,
  description: text(2000),
  onboarding_answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).nullable().optional(),
  target_audience: z.unknown().optional(),
  value_proposition: text(2000),

  // Playbook (audit §4.1)
  business_type: z.enum(BUSINESS_TYPES).nullable().optional(),
  automation_mode: z.enum(AUTOMATION_MODE_IDS).optional(),
  wants_hosted_page: z.boolean().optional(),
  business_location: text(200),
  services: list(120, 30),

  // Business profile, folded in from /projects/[id]/onboarding
  industry: text(80),
  business_description: text(600),
  audience_pain_point: text(300),
  online_channels: list(60, 20),
  brand_voice: text(80),
  brand_voice_example: text(600),
  primary_goal: text(120),
  competitors: list(2048, 10),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Send the project as JSON", code: "INVALID_INPUT" }, { status: 400 });
  }

  const parsed = CreateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path?.[0];
    const message =
      field === "name" ? "Project name is required" : first?.message || "Something in the form isn't right";
    return NextResponse.json({ error: message, field, code: "INVALID_INPUT" }, { status: 400 });
  }
  const input = parsed.data;

  // Enforce project-count limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(profile?.plan);
  const limit = getProjectLimit(plan);
  if (!isUnlimited(limit)) {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `Project limit reached (${limit}). Upgrade your plan to create more projects.`,
          code: "PROJECT_LIMIT",
        },
        { status: 403 }
      );
    }
  }

  // The profile counts as done when the owner told us the basics about
  // the business. Everything stays editable under Settings.
  const profileGiven = Boolean(
    input.industry || input.brand_voice || input.primary_goal || input.business_description
  );

  // No website means we build their first page from their answers.
  const wantsHostedPage = input.wants_hosted_page ?? (!input.website_url && input.business_type === "local");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: input.name,
      website_url: input.website_url ?? null,
      description: input.description ?? null,
      onboarding_answers: input.onboarding_answers ?? null,
      target_audience: input.target_audience ?? null,
      value_proposition: input.value_proposition ?? null,

      business_type: input.business_type ?? null,
      automation_mode: input.automation_mode ?? DEFAULT_AUTOMATION_MODE,
      wants_hosted_page: wantsHostedPage,
      business_location: input.business_location ?? null,
      services: input.services ?? [],

      industry: input.industry ?? null,
      business_description: input.business_description ?? null,
      audience_pain_point: input.audience_pain_point ?? null,
      online_channels: input.online_channels ?? [],
      brand_voice: input.brand_voice ?? null,
      brand_voice_example: input.brand_voice_example ?? null,
      primary_goal: input.primary_goal ?? null,
      competitors: input.competitors && input.competitors.length > 0 ? input.competitors : null,
      onboarding_completed: profileGiven,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
