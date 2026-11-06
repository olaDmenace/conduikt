import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { BUSINESS_TYPES } from "@/src/lib/playbooks";
import { AUTOMATION_MODE_IDS } from "@/src/lib/automation/mode";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      audits(id, type, url, score, findings, created_at),
      assets(id, type, title, status, created_at),
      campaigns(id, name, type, status, created_at)
    `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

// Fields with a fixed shape are checked before they reach the database.
// Everything else in allowedFields is passed through as before.
const TypedPatchSchema = z.object({
  business_type: z.enum(BUSINESS_TYPES).nullable().optional(),
  automation_mode: z.enum(AUTOMATION_MODE_IDS).optional(),
  wants_hosted_page: z.boolean().optional(),
  business_location: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(200).nullable().optional()
  ),
  services: z.preprocess(
    (v) =>
      Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.trim()).map((s: string) => s.trim()) : v,
    z.array(z.string().max(120)).max(30).optional()
  ),
});

const TYPED_KEYS = Object.keys(TypedPatchSchema.shape);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Send the changes as JSON", code: "INVALID_INPUT" }, { status: 400 });
  }

  // Only allow updating specific fields
  const allowedFields = [
    "name",
    "website_url",
    "description",
    "target_audience",
    "value_proposition",
    "brand_voice",
    "competitors",
    "positioning_statement",
    "keywords",
    "onboarding_answers",
    "industry",
    "business_description",
    "audience_pain_point",
    "online_channels",
    "brand_voice_example",
    "primary_goal",
    "onboarding_completed",
    "client_name",
    "client_logo_url",
    "report_accent_color",
    // Playbook and mode (audit §4.1, D4)
    "business_type",
    "automation_mode",
    "wants_hosted_page",
    "business_location",
    "services",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const typedInput: Record<string, unknown> = {};
  for (const key of TYPED_KEYS) if (key in updates) typedInput[key] = updates[key];
  if (Object.keys(typedInput).length > 0) {
    const parsed = TypedPatchSchema.safeParse(typedInput);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message || "Something in the form isn't right", field: first?.path?.[0], code: "INVALID_INPUT" },
        { status: 400 }
      );
    }
    for (const [key, value] of Object.entries(parsed.data)) {
      if (key in typedInput) updates[key] = value;
    }
  }

  const { data: project, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
