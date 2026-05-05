import { registerHandler } from "../registry";
import { enqueueExecution } from "../enqueue";
import { sendSequenceEmail } from "@/src/lib/email/sequence-send";
import { CONDUIKT_SHARED_FROM_EMAIL } from "@/src/lib/email/marketing";
import { prependBrandHeader } from "@/src/lib/email/brand-header";
import type { ExecutionHandler } from "../types";

// Handler for execution_type='email_sequence_step'.
//
// Payload shape:
//   { enrollmentId: string, stepOrder: number }
//
// Per-tick flow:
//   1. Load enrollment. Skip if not active (someone paused/cancelled it).
//   2. Load contact. Skip + cancel enrollment if not 'subscribed' (they
//      unsubscribed / bounced between scheduling and sending).
//   3. Load step + its asset. Hard-fail if missing — sequence was deleted.
//   4. Send via Resend transactional with per-contact unsubscribe URL.
//   5. Bump enrollment.current_step_order, last_step_at.
//   6. Enqueue the next step (delay = next_step.delay_hours from now), or
//      mark enrollment 'completed' if this was the last.
//   7. Increment user's monthly email usage by 1.

interface Payload {
  enrollmentId: string;
  stepOrder: number;
}

function isPayload(p: unknown): p is Payload {
  return (
    !!p &&
    typeof p === "object" &&
    typeof (p as Payload).enrollmentId === "string" &&
    typeof (p as Payload).stepOrder === "number"
  );
}

const handler: ExecutionHandler = async (rawPayload, { execution, supabase }) => {
  if (!isPayload(rawPayload)) {
    return { ok: false, error: "Invalid payload shape", retryable: false };
  }
  const { enrollmentId, stepOrder } = rawPayload;

  // 1. Enrollment.
  const { data: enrollment, error: enrErr } = await supabase
    .from("email_sequence_enrollments")
    .select("id, user_id, sequence_id, contact_id, audience_id, status, current_step_order")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (enrErr) return { ok: false, error: `Enrollment query failed: ${enrErr.message}` };
  if (!enrollment) {
    return { ok: false, error: "Enrollment not found", retryable: false };
  }
  if (enrollment.status !== "active") {
    // Paused / cancelled / completed — silently succeed (no-op).
    return { ok: true, result: { skipped: true, reason: enrollment.status } };
  }

  // 2. Contact.
  const { data: contact } = await supabase
    .from("audience_contacts")
    .select("id, email, status, unsubscribe_token")
    .eq("id", enrollment.contact_id)
    .maybeSingle();

  if (!contact) {
    await supabase
      .from("email_sequence_enrollments")
      .update({ status: "cancelled", cancellation_reason: "contact_deleted" })
      .eq("id", enrollment.id);
    return { ok: true, result: { skipped: true, reason: "contact_deleted" } };
  }
  if (contact.status !== "subscribed") {
    await supabase
      .from("email_sequence_enrollments")
      .update({ status: "cancelled", cancellation_reason: contact.status })
      .eq("id", enrollment.id);
    return { ok: true, result: { skipped: true, reason: contact.status } };
  }

  // 3. Step + asset.
  const { data: step } = await supabase
    .from("email_sequence_steps")
    .select(
      "id, sequence_id, step_order, delay_hours, subject_line, asset_id, assets ( id, content, title )"
    )
    .eq("sequence_id", enrollment.sequence_id)
    .eq("step_order", stepOrder)
    .maybeSingle();

  if (!step) {
    return {
      ok: false,
      error: `Step ${stepOrder} not found in sequence ${enrollment.sequence_id}`,
      retryable: false,
    };
  }

  // The asset's `content` is jsonb. AI-generated assets store HTML as
  // `body_html`; the older POST flow uses `html`. Support both.
  const asset = Array.isArray(step.assets) ? step.assets[0] : step.assets;
  const content = (asset?.content ?? {}) as Record<string, unknown>;
  const html =
    (typeof content.body_html === "string" && content.body_html) ||
    (typeof content.html === "string" && content.html) ||
    "";
  const subject =
    step.subject_line ||
    (typeof content.subject === "string" && content.subject) ||
    asset?.title ||
    "(no subject)";

  if (!html) {
    return {
      ok: false,
      error: `Step ${stepOrder} has no HTML body`,
      retryable: false,
    };
  }

  // 3b. Brand identity for the header. The audience belongs to a
  // project, and the project carries `client_logo_url` (per-client
  // branding for Agency-tier multi-client setups) — that's the correct
  // source for sequence emails since the sequence belongs to the
  // project, not the user's personal Brand Kit.
  //
  // Lookup order:
  //   1. projects.client_logo_url (per-project; matches the audience)
  //   2. profiles.brand_logo_url  (user-level Brand Kit fallback)
  // Both lookups are best-effort: if neither is set, prependBrandHeader
  // becomes a no-op and the email goes out without a header — better
  // than failing the whole send for branding.
  const { data: audienceRow } = await supabase
    .from("audiences")
    .select("project_id")
    .eq("id", enrollment.audience_id)
    .maybeSingle();

  const { data: projectRow } = audienceRow?.project_id
    ? await supabase
        .from("projects")
        .select("name, client_logo_url")
        .eq("id", audienceRow.project_id)
        .maybeSingle()
    : { data: null };

  let logoUrl: string | null = projectRow?.client_logo_url ?? null;
  if (!logoUrl) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("brand_logo_url")
      .eq("id", enrollment.user_id)
      .maybeSingle();
    logoUrl = profileRow?.brand_logo_url ?? null;
  }

  const brandedHtml = prependBrandHeader(html, {
    logoUrl,
    altText: projectRow?.name,
  });

  // 4. Send. The user's project may set a custom from_name later; for
  // now we use the shared sender (mail@conduikt.com) — same as broadcasts.
  const sendResult = await sendSequenceEmail({
    to: contact.email,
    subject,
    html: brandedHtml,
    unsubscribeToken: contact.unsubscribe_token,
    from: `Conduikt <${CONDUIKT_SHARED_FROM_EMAIL}>`,
    tags: [
      { name: "type", value: "sequence_step" },
      { name: "enrollment_id", value: enrollment.id },
      { name: "step_order", value: String(stepOrder) },
    ],
  });

  if (!sendResult.ok) {
    // Network-y issues are retryable; Resend "invalid recipient" etc.
    // are not — we don't have a great heuristic, so default to retryable.
    return { ok: false, error: sendResult.error ?? "Send failed" };
  }

  // 5. Bump enrollment progress.
  const nowIso = new Date().toISOString();
  await supabase
    .from("email_sequence_enrollments")
    .update({ current_step_order: stepOrder, last_step_at: nowIso })
    .eq("id", enrollment.id);

  // 6. Enqueue next step or complete.
  const { data: nextStep } = await supabase
    .from("email_sequence_steps")
    .select("step_order, delay_hours")
    .eq("sequence_id", enrollment.sequence_id)
    .gt("step_order", stepOrder)
    .order("step_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextStep) {
    const delayHours = Math.max(0, Number(nextStep.delay_hours ?? 0));
    const scheduledFor = new Date(Date.now() + delayHours * 3600_000);
    await enqueueExecution(supabase, {
      userId: enrollment.user_id,
      executionType: "email_sequence_step",
      payload: { enrollmentId: enrollment.id, stepOrder: nextStep.step_order },
      scheduledFor,
      idempotencyKey: `seq-step:${enrollment.id}:${nextStep.step_order}`,
      parentId: enrollment.id,
      parentType: "email_sequence_enrollment",
    });
  } else {
    await supabase
      .from("email_sequence_enrollments")
      .update({ status: "completed", completed_at: nowIso })
      .eq("id", enrollment.id);
  }

  // 7. Email usage. Mirror the broadcast send route's pattern: reset counter
  // on first send of a new month, otherwise atomic increment.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_usage_reset_at")
    .eq("id", enrollment.user_id)
    .single();
  const now = new Date();
  const resetAt = profile?.email_usage_reset_at
    ? new Date(profile.email_usage_reset_at)
    : null;
  const inCurrentMonth =
    resetAt &&
    resetAt.getUTCFullYear() === now.getUTCFullYear() &&
    resetAt.getUTCMonth() === now.getUTCMonth();
  if (!inCurrentMonth) {
    await supabase
      .from("profiles")
      .update({ email_usage_count: 1, email_usage_reset_at: nowIso })
      .eq("id", enrollment.user_id);
  } else {
    await supabase.rpc("increment_email_usage", {
      user_id_param: enrollment.user_id,
      by_count: 1,
    });
  }

  // Reference `execution` so eslint doesn't flag the unused destructure;
  // also useful if we later want to log execution.attempts.
  void execution;

  return {
    ok: true,
    result: {
      resend_email_id: sendResult.resendEmailId ?? null,
      step_order: stepOrder,
      next_step_order: nextStep?.step_order ?? null,
    },
  };
};

registerHandler("email_sequence_step", handler);

export default handler;
