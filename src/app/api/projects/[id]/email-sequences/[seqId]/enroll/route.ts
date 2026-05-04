import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { enqueueExecution } from "@/src/lib/scheduler/enqueue";
import { checkEmailsPerMonthLimit, getUserPlan } from "@/src/lib/email/usage";

// POST /api/projects/[id]/email-sequences/[seqId]/enroll
// Body: { audienceId: string }
//
// Enrolls every subscribed contact in the audience into the sequence.
//
// Flow:
//   1. Auth + project ownership.
//   2. Validate sequence belongs to project and has at least one step.
//   3. Validate audience belongs to project, count subscribed contacts.
//   4. Plan-gate: subscribed × total_steps must fit remaining email quota.
//   5. Insert enrollments (UPSERT on (sequence_id, contact_id) — re-enroll
//      is a no-op for active rows, but reactivates cancelled rows).
//   6. Enqueue step 1 for each fresh enrollment, scheduled with step 1's
//      delay_hours from now (idempotency_key dedupes if cron re-fires).
//
// Returns: { enrolled, skipped, total_steps, first_step_at }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seqId: string }> }
) {
  const { id: projectId, seqId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { audienceId?: string };
  const audienceId = body.audienceId;
  if (!audienceId) {
    return NextResponse.json({ error: "audienceId is required" }, { status: 400 });
  }

  // Sequence belongs to project + has steps.
  const { data: sequence } = await supabase
    .from("email_sequences")
    .select("id, project_id, name, email_sequence_steps ( id, step_order, delay_hours )")
    .eq("id", seqId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sequence) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  }
  const steps = Array.isArray(sequence.email_sequence_steps)
    ? [...sequence.email_sequence_steps].sort(
        (a, b) => (a.step_order as number) - (b.step_order as number)
      )
    : [];
  if (steps.length === 0) {
    return NextResponse.json(
      { error: "Sequence has no steps to send" },
      { status: 409 }
    );
  }

  // Audience belongs to project.
  const { data: audience } = await supabase
    .from("audiences")
    .select("id, project_id")
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!audience) {
    return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  }

  // Subscribed contacts only — we never enroll bounced/unsubscribed.
  const { data: contacts, error: cErr } = await supabase
    .from("audience_contacts")
    .select("id")
    .eq("audience_id", audienceId)
    .eq("status", "subscribed");
  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  const subscribedCount = contacts?.length ?? 0;
  if (subscribedCount === 0) {
    return NextResponse.json(
      { error: "Audience has no subscribed contacts" },
      { status: 409 }
    );
  }

  // Plan gate: total emails over the sequence's lifetime must fit quota.
  const totalEmails = subscribedCount * steps.length;
  const plan = await getUserPlan(supabase, user.id);
  const usage = await checkEmailsPerMonthLimit(
    supabase,
    user.id,
    plan,
    totalEmails
  );
  if (!usage.ok) {
    return NextResponse.json(
      {
        error: `Enrollment would exceed monthly email quota (${usage.used} used + ${totalEmails} from this sequence > ${usage.limit}).`,
        code: "PLAN_GATED",
        limits: usage,
      },
      { status: 403 }
    );
  }

  // Service client for the enroll + enqueue path so we bypass RLS during
  // bulk inserts. Both tables enforce ownership above this point.
  const service = createServiceClient();

  // Insert enrollments. Conflict on the (sequence_id, contact_id) unique
  // constraint = re-enroll attempt; for now we leave existing rows alone
  // and only enqueue step 1 for genuinely new rows.
  const rowsToInsert = (contacts ?? []).map((c) => ({
    user_id: user.id,
    sequence_id: seqId,
    contact_id: c.id,
    audience_id: audienceId,
  }));

  const { data: inserted, error: insErr } = await service
    .from("email_sequence_enrollments")
    .upsert(rowsToInsert, {
      onConflict: "sequence_id,contact_id",
      ignoreDuplicates: true,
    })
    .select("id, contact_id");

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const newlyEnrolled = inserted ?? [];
  const skippedCount = subscribedCount - newlyEnrolled.length;

  // Enqueue step 1 for each newly enrolled row.
  const firstStep = steps[0];
  const firstDelayHours = Math.max(0, Number(firstStep?.delay_hours ?? 0));
  const firstStepAt = new Date(Date.now() + firstDelayHours * 3600_000);

  for (const enrollment of newlyEnrolled) {
    await enqueueExecution(service, {
      userId: user.id,
      executionType: "email_sequence_step",
      payload: {
        enrollmentId: enrollment.id,
        stepOrder: firstStep.step_order as number,
      },
      scheduledFor: firstStepAt,
      idempotencyKey: `seq-step:${enrollment.id}:${firstStep.step_order}`,
      parentId: enrollment.id,
      parentType: "email_sequence_enrollment",
    });
  }

  return NextResponse.json({
    enrolled: newlyEnrolled.length,
    skipped: skippedCount,
    total_steps: steps.length,
    first_step_at: firstStepAt.toISOString(),
  });
}
