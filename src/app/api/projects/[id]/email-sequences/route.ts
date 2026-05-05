import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { checkSequenceLimit, getUserPlan } from "@/src/lib/email/usage";

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

  const ownedProject = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: sequences, error } = await supabase
    .from("email_sequences")
    .select(
      `
      id,
      name,
      type,
      status,
      created_at,
      email_sequence_steps ( id )
    `
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (sequences ?? []).map((seq) => ({
    ...seq,
    step_count: Array.isArray(seq.email_sequence_steps)
      ? seq.email_sequence_steps.length
      : 0,
    email_sequence_steps: undefined,
  }));

  return NextResponse.json(result);
}

// POST /api/projects/[id]/email-sequences
//
// Creates an email_sequences row + email_sequence_steps rows + per-step
// assets in one go. Accepts EITHER shape:
//
//   AI-native (preferred — what the email-sequence agent emits):
//     { sequence_name, type, trigger?, emails: [
//         { step, delay_hours, subject_line, preview_text, body_html,
//           cta_text, cta_url, goal? }, ...
//       ] }
//
//   Legacy form (kept so older callers don't break):
//     { name, type, steps: [
//         { subject, preview_text, html, cta_text, cta_url,
//           delay_hours? | delay_days? }, ...
//       ] }
//
// Plan-gates total sequences across the user's projects.

interface AiEmail {
  step?: number;
  delay_hours?: number;
  subject_line?: string;
  preview_text?: string;
  body_html?: string;
  cta_text?: string;
  cta_url?: string;
  goal?: string;
}

interface LegacyStep {
  subject?: string;
  subject_line?: string;
  preview_text?: string;
  html?: string;
  body_html?: string;
  cta_text?: string;
  cta_url?: string;
  delay_hours?: number;
  delay_days?: number;
}

interface NormalizedStep {
  step_order: number;
  delay_hours: number;
  subject_line: string;
  preview_text: string;
  body_html: string;
  cta_text: string;
  cta_url: string;
  goal: string | null;
}

function normalizeSteps(body: Record<string, unknown>): NormalizedStep[] {
  // AI-native format wins if both are present.
  if (Array.isArray(body.emails)) {
    return (body.emails as AiEmail[]).map((e, i) => ({
      step_order: typeof e.step === "number" ? e.step : i + 1,
      delay_hours: Math.max(0, Number(e.delay_hours ?? 0)),
      subject_line: (e.subject_line ?? "").toString().trim(),
      preview_text: (e.preview_text ?? "").toString().trim(),
      body_html: (e.body_html ?? "").toString(),
      cta_text: (e.cta_text ?? "").toString().trim(),
      cta_url: (e.cta_url ?? "").toString().trim(),
      goal: e.goal ? e.goal.toString().trim() : null,
    }));
  }
  if (Array.isArray(body.steps)) {
    return (body.steps as LegacyStep[]).map((s, i) => {
      // Convert legacy delay_days → delay_hours if present.
      const delayHours =
        typeof s.delay_hours === "number"
          ? s.delay_hours
          : typeof s.delay_days === "number"
            ? s.delay_days * 24
            : i === 0
              ? 0
              : 48;
      return {
        step_order: i + 1,
        delay_hours: Math.max(0, delayHours),
        subject_line: (s.subject_line ?? s.subject ?? "").toString().trim(),
        preview_text: (s.preview_text ?? "").toString().trim(),
        body_html: (s.body_html ?? s.html ?? "").toString(),
        cta_text: (s.cta_text ?? "").toString().trim(),
        cta_url: (s.cta_url ?? "").toString().trim(),
        goal: null,
      };
    });
  }
  return [];
}

export async function POST(
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

  const ownedProject2 = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name =
    (typeof body.sequence_name === "string" && body.sequence_name) ||
    (typeof body.name === "string" && body.name) ||
    "";
  const type = typeof body.type === "string" ? body.type : "nurture";
  const trigger = typeof body.trigger === "string" ? body.trigger : null;

  const steps = normalizeSteps(body);

  if (!name) {
    return NextResponse.json(
      { error: "sequence_name (or name) is required" },
      { status: 400 }
    );
  }
  if (steps.length === 0) {
    return NextResponse.json(
      { error: "At least one step (emails[] or steps[]) is required" },
      { status: 400 }
    );
  }
  // Reject empty steps so we don't ship a sequence that 500s at send time.
  for (const s of steps) {
    if (!s.body_html || !s.subject_line) {
      return NextResponse.json(
        {
          error: `Step ${s.step_order} is missing body_html or subject_line`,
        },
        { status: 400 }
      );
    }
  }

  // Plan-tier gate on total sequences.
  const plan = await getUserPlan(supabase, user.id);
  const seqLimit = await checkSequenceLimit(supabase, user.id, plan);
  if (!seqLimit.ok) {
    return NextResponse.json(
      {
        error: `You've hit your plan's sequence limit (${seqLimit.used}/${seqLimit.limit}). Upgrade or delete an existing sequence to create another.`,
        code: "PLAN_GATED_SEQUENCES",
        limits: seqLimit,
      },
      { status: 403 }
    );
  }

  // Create sequence row first (parent), then steps + per-step assets.
  const { data: sequence, error: seqError } = await supabase
    .from("email_sequences")
    .insert({
      project_id: id,
      name,
      type,
      trigger_event: trigger,
      status: "draft",
    })
    .select("id, name, type, status, created_at")
    .single();

  if (seqError || !sequence) {
    return NextResponse.json(
      { error: seqError?.message ?? "Could not create sequence" },
      { status: 500 }
    );
  }

  // Insert per-step assets in parallel; the runner reads each step's
  // asset.content for body_html + cta info at send time.
  const assetIds: (string | null)[] = await Promise.all(
    steps.map(async (s) => {
      const { data: asset } = await supabase
        .from("assets")
        .insert({
          project_id: id,
          type: "email",
          channel: "email",
          title: s.subject_line.slice(0, 200),
          // Save under both `body_html` (AI-native, what the runner reads
          // first) AND `html` (legacy, what older code paths look for) so
          // existing code that hasn't been migrated still works.
          content: {
            subject: s.subject_line,
            preview_text: s.preview_text,
            body_html: s.body_html,
            html: s.body_html,
            cta_text: s.cta_text,
            cta_url: s.cta_url,
            goal: s.goal,
          },
          status: "draft",
        })
        .select("id")
        .single();
      return asset?.id ?? null;
    })
  );

  // Insert steps. Real schema columns: step_order, delay_hours,
  // subject_line, preview_text, asset_id.
  const stepRows = steps.map((s, i) => ({
    sequence_id: sequence.id,
    step_order: s.step_order,
    delay_hours: s.delay_hours,
    subject_line: s.subject_line,
    preview_text: s.preview_text,
    asset_id: assetIds[i],
  }));
  const { error: stepError } = await supabase
    .from("email_sequence_steps")
    .insert(stepRows);

  if (stepError) {
    // Best-effort cleanup so we don't leave an orphan sequence row. RLS
    // allows owners to delete their own rows.
    await supabase.from("email_sequences").delete().eq("id", sequence.id);
    return NextResponse.json(
      { error: `Failed to create steps: ${stepError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ...sequence, step_count: steps.length },
    { status: 201 }
  );
}
