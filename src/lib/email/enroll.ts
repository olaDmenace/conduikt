import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueExecution } from "@/src/lib/scheduler/enqueue";

// Puts one contact into an email series and schedules its first step.
// Shared by the lead-form submit path and the double opt-in confirm path
// so both enrol the same way. Idempotent on (sequence_id, contact_id).

export interface EnrollInput {
  userId: string;
  sequenceId: string;
  contactId: string;
  audienceId: string;
}

export interface EnrollResult {
  enrolled: boolean;
  enrollmentId?: string;
  reason?: "no_steps" | "insert_failed";
}

export async function enrollContactInSequence(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  input: EnrollInput
): Promise<EnrollResult> {
  const { data: firstStep } = await supabase
    .from("email_sequence_steps")
    .select("step_order, delay_hours")
    .eq("sequence_id", input.sequenceId)
    .order("step_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstStep) return { enrolled: false, reason: "no_steps" };

  const { data: enrollment } = await supabase
    .from("email_sequence_enrollments")
    .upsert(
      {
        user_id: input.userId,
        sequence_id: input.sequenceId,
        contact_id: input.contactId,
        audience_id: input.audienceId,
      },
      { onConflict: "sequence_id,contact_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (!enrollment) return { enrolled: false, reason: "insert_failed" };

  const delayHours = Math.max(0, Number(firstStep.delay_hours ?? 0));
  const scheduledFor = new Date(Date.now() + delayHours * 3600_000);
  await enqueueExecution(supabase, {
    userId: input.userId,
    executionType: "email_sequence_step",
    payload: { enrollmentId: enrollment.id, stepOrder: firstStep.step_order },
    scheduledFor,
    idempotencyKey: `seq-step:${enrollment.id}:${firstStep.step_order}`,
    parentId: enrollment.id,
    parentType: "email_sequence_enrollment",
  });

  return { enrolled: true, enrollmentId: enrollment.id };
}
