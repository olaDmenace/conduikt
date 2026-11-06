import { registerHandler } from "../registry";
import { enqueueExecution } from "../enqueue";
import {
  getWhatsAppConnection,
  normalisePhone,
  recordWhatsAppEvent,
  sendTemplateMessage,
  sendTextMessage,
  WHATSAPP_NOT_CONNECTED_MESSAGE,
  type TemplateComponent,
} from "@/src/lib/integrations/whatsapp";
import type { ExecutionHandler } from "../types";

// Handler for execution_type='whatsapp_step'. Mirrors email-sequence-step:
// the same enrollment and step tables, a different channel.
//
// Payload shape:
//   { enrollmentId: string, stepOrder: number }
//
// Per-tick flow:
//   1. Load enrollment. Skip if not active.
//   2. Load contact. Cancel if deleted. Skip the step (not the whole
//      sequence) if the contact has no phone or no WhatsApp consent.
//   3. Load step (must be channel='whatsapp') + asset. The asset content
//      carries either a template (template_name, language_code,
//      components) or plain text (body_text / raw / scheduled_text).
//   4. Send through the project's WhatsApp connection. No connection, or a
//      permanent Meta error, records a 'failed' event and skips the step
//      (the sequence continues); transient errors are retried.
//   5. Record a 'sent' event, bump enrollment progress.
//   6. Enqueue the next step on its own channel's handler, or complete.
//
// Registration line for src/lib/scheduler/handlers.ts:
//   import "./handlers/whatsapp-step";

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

interface WhatsAppAssetContent {
  template_name?: string;
  language_code?: string;
  components?: TemplateComponent[];
  body_text?: string;
  scheduled_text?: string;
  raw?: string;
  text?: string;
}

/** Pick the message out of an asset's jsonb content (exported for tests). */
export function messageFromContent(content: Record<string, unknown> | null | undefined): {
  template?: { templateName: string; languageCode: string; components?: TemplateComponent[] };
  text?: string;
} {
  const c = (content ?? {}) as WhatsAppAssetContent;
  if (typeof c.template_name === "string" && c.template_name.trim()) {
    return {
      template: {
        templateName: c.template_name.trim(),
        languageCode: typeof c.language_code === "string" && c.language_code ? c.language_code : "en",
        components: Array.isArray(c.components) ? c.components : undefined,
      },
    };
  }
  const text =
    (typeof c.body_text === "string" && c.body_text) ||
    (typeof c.scheduled_text === "string" && c.scheduled_text) ||
    (typeof c.text === "string" && c.text) ||
    (typeof c.raw === "string" && c.raw) ||
    "";
  return text.trim() ? { text: text.trim() } : {};
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
  if (!enrollment) return { ok: false, error: "Enrollment not found", retryable: false };
  if (enrollment.status !== "active") {
    return { ok: true, result: { skipped: true, reason: enrollment.status } };
  }

  // 2. Contact and consent.
  const { data: contact } = await supabase
    .from("audience_contacts")
    .select("id, phone, whatsapp_opt_in, status, first_name")
    .eq("id", enrollment.contact_id)
    .maybeSingle();

  if (!contact) {
    await supabase
      .from("email_sequence_enrollments")
      .update({ status: "cancelled", cancellation_reason: "contact_deleted" })
      .eq("id", enrollment.id);
    return { ok: true, result: { skipped: true, reason: "contact_deleted" } };
  }

  const phone = normalisePhone(contact.phone as string | null);
  if (!contact.whatsapp_opt_in || !phone) {
    // No consent (or no number): this step is skipped, the sequence goes
    // on to the next step. We never message someone who has not agreed.
    const reason = !phone ? "no_phone" : "no_whatsapp_consent";
    await advance(supabase, enrollment, stepOrder);
    return { ok: true, result: { skipped: true, reason } };
  }

  // 3. Step + asset.
  const { data: step } = await supabase
    .from("email_sequence_steps")
    .select("id, sequence_id, step_order, delay_hours, channel, asset_id, assets ( id, content, title )")
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
  if (step.channel && step.channel !== "whatsapp") {
    return {
      ok: false,
      error: `Step ${stepOrder} is a ${step.channel} step, not a WhatsApp step`,
      retryable: false,
    };
  }

  const asset = Array.isArray(step.assets) ? step.assets[0] : step.assets;
  const message = messageFromContent((asset?.content ?? null) as Record<string, unknown> | null);
  if (!message.template && !message.text) {
    return { ok: false, error: `Step ${stepOrder} has no WhatsApp message`, retryable: false };
  }

  // 4. Project connection via the audience.
  const { data: audienceRow } = await supabase
    .from("audiences")
    .select("project_id")
    .eq("id", enrollment.audience_id)
    .maybeSingle();
  const projectId = (audienceRow?.project_id as string | undefined) ?? null;
  if (!projectId) {
    return { ok: false, error: "Audience has no project", retryable: false };
  }

  const conn = await getWhatsAppConnection(supabase, projectId);
  if (!conn) {
    // No WhatsApp connection on this project: the step cannot be sent and
    // retrying will not change that. Record it so the owner can see why,
    // then skip this step and carry on with the rest of the sequence
    // (email steps still go out) instead of leaving the enrollment stuck.
    await recordWhatsAppEvent(supabase, {
      projectId,
      direction: "outbound",
      eventType: "failed",
      contactId: contact.id as string,
      enrollmentId: enrollment.id as string,
      phone,
      body: WHATSAPP_NOT_CONNECTED_MESSAGE,
      metadata: { step_order: stepOrder, reason: "whatsapp_not_connected" },
    });
    const next = await advance(supabase, enrollment, stepOrder);
    return {
      ok: true,
      result: { skipped: true, reason: "whatsapp_not_connected", step_order: stepOrder, next_step_order: next?.step_order ?? null },
    };
  }

  const sendResult = message.template
    ? await sendTemplateMessage(conn, {
        to: phone,
        templateName: message.template.templateName,
        languageCode: message.template.languageCode,
        components: message.template.components,
      })
    : await sendTextMessage(conn, { to: phone, body: message.text! });

  if (!sendResult.ok) {
    await recordWhatsAppEvent(supabase, {
      projectId,
      direction: "outbound",
      eventType: "failed",
      contactId: contact.id as string,
      enrollmentId: enrollment.id as string,
      phone,
      body: sendResult.error,
      metadata: { step_order: stepOrder, code: sendResult.code ?? null },
    });
    // Meta error 131047 (outside 24h window) and 132xxx (template issues)
    // will not fix themselves on retry: the failure is recorded above, this
    // step is skipped and the sequence moves on. Anything else is retried.
    const permanent = sendResult.code !== undefined && sendResult.code >= 130000;
    if (!permanent) return { ok: false, error: sendResult.error, retryable: true };
    const next = await advance(supabase, enrollment, stepOrder);
    return {
      ok: true,
      result: { skipped: true, reason: "send_failed", code: sendResult.code ?? null, error: sendResult.error, step_order: stepOrder, next_step_order: next?.step_order ?? null },
    };
  }

  // 5. Record + bump.
  await recordWhatsAppEvent(supabase, {
    projectId,
    direction: "outbound",
    eventType: "sent",
    contactId: contact.id as string,
    enrollmentId: enrollment.id as string,
    waMessageId: sendResult.messageId,
    phone,
    body: message.text ?? `template:${message.template?.templateName}`,
    metadata: { step_order: stepOrder },
  });

  // 6. Next step or complete.
  const next = await advance(supabase, enrollment, stepOrder);

  void execution;

  return {
    ok: true,
    result: {
      wa_message_id: sendResult.messageId,
      step_order: stepOrder,
      next_step_order: next?.step_order ?? null,
    },
  };
};

/**
 * Bump enrollment progress and enqueue the next step on the handler that
 * matches its channel (email steps go back to email_sequence_step).
 */
async function advance(
  supabase: Parameters<ExecutionHandler>[1]["supabase"],
  enrollment: { id: string; user_id: string; sequence_id: string },
  stepOrder: number
): Promise<{ step_order: number; channel: string } | null> {
  const nowIso = new Date().toISOString();
  await supabase
    .from("email_sequence_enrollments")
    .update({ current_step_order: stepOrder, last_step_at: nowIso })
    .eq("id", enrollment.id);

  const { data: nextStep } = await supabase
    .from("email_sequence_steps")
    .select("step_order, delay_hours, channel")
    .eq("sequence_id", enrollment.sequence_id)
    .gt("step_order", stepOrder)
    .order("step_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextStep) {
    await supabase
      .from("email_sequence_enrollments")
      .update({ status: "completed", completed_at: nowIso })
      .eq("id", enrollment.id);
    return null;
  }

  const channel = (nextStep.channel as string | null) === "whatsapp" ? "whatsapp" : "email";
  const executionType = channel === "whatsapp" ? "whatsapp_step" : "email_sequence_step";
  const delayHours = Math.max(0, Number(nextStep.delay_hours ?? 0));
  await enqueueExecution(supabase, {
    userId: enrollment.user_id,
    executionType,
    payload: { enrollmentId: enrollment.id, stepOrder: nextStep.step_order },
    scheduledFor: new Date(Date.now() + delayHours * 3600_000),
    idempotencyKey: `seq-step:${enrollment.id}:${nextStep.step_order}`,
    parentId: enrollment.id,
    parentType: "email_sequence_enrollment",
  });
  return { step_order: nextStep.step_order as number, channel };
}

registerHandler("whatsapp_step", handler);

export default handler;
