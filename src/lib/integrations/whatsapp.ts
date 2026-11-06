import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/src/lib/supabase/service";
import { decryptToken } from "@/src/lib/crypto/tokens";

// WhatsApp Business Platform (Cloud API), audit 2026-10-24 §6 item 1.
//
// Connection: one per project, a connected_accounts row with
// platform = 'whatsapp', platform_user_id = phone number id, the permanent
// system-user access token encrypted in access_token, and
// metadata = { display_phone_number, business_account_id }.
//
// Env:
//   WHATSAPP_VERIFY_TOKEN  the string you type into Meta's webhook setup;
//                          the GET handshake must echo it back.
//   FACEBOOK_APP_SECRET    signs webhook POSTs (X-Hub-Signature-256).
//
// Consent: Meta policy and Nigeria's NDPA 2023 both need an opt-in before
// a business messages someone. The whatsapp_step handler checks
// audience_contacts.whatsapp_opt_in and refuses otherwise; an inbound
// "STOP" sets it back to false.

export const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export const WHATSAPP_NOT_CONNECTED_MESSAGE =
  "WhatsApp is not connected for this project";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

// ---------------------------------------------------------------------------
// Phone numbers
// ---------------------------------------------------------------------------

/**
 * Normalise to international digits without a plus sign, as the Cloud API
 * expects: "0803 123 4567" -> "2348031234567", "+234 803..." -> "234803...".
 * Nigerian local numbers (leading 0, 11 digits) get the 234 code. Returns
 * null when the input cannot be a phone number.
 */
export function normalisePhone(raw: string | null | undefined, defaultCountryCode = "234"): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  // International prefix written as 00.
  if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0") && digits.length === 11) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  } else if (digits.startsWith("0")) {
    // Other local formats: strip one leading zero and prefix.
    digits = `${defaultCountryCode}${digits.replace(/^0+/, "")}`;
  } else if (digits.length === 10 && defaultCountryCode === "234") {
    // "8031234567" typed without the leading zero.
    digits = `234${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export interface WhatsAppConnection {
  id: string;
  projectId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  /** Decrypted. Never persist or log it. */
  accessToken: string;
}

export async function getWhatsAppConnection(
  db: Db,
  projectId: string
): Promise<WhatsAppConnection | null> {
  const { data } = await db
    .from("connected_accounts")
    .select("id, project_id, platform_user_id, access_token, metadata")
    .eq("project_id", projectId)
    .eq("platform", "whatsapp")
    .maybeSingle();
  if (!data?.platform_user_id || !data.access_token) return null;
  let accessToken: string;
  try {
    accessToken = decryptToken(data.access_token as string);
  } catch {
    return null;
  }
  const meta = (data.metadata ?? {}) as { display_phone_number?: string };
  return {
    id: data.id as string,
    projectId: data.project_id as string,
    phoneNumberId: data.platform_user_id as string,
    displayPhoneNumber: meta.display_phone_number ?? null,
    accessToken,
  };
}

/** Look up which project owns a phone number id (used by the webhook). */
export async function findProjectByPhoneNumberId(
  db: Db,
  phoneNumberId: string
): Promise<string | null> {
  const { data } = await db
    .from("connected_accounts")
    .select("project_id")
    .eq("platform", "whatsapp")
    .eq("platform_user_id", phoneNumberId)
    .maybeSingle();
  return (data?.project_id as string | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: string;
  parameters: Array<Record<string, unknown>>;
}

export interface SendTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

export interface SendTextInput {
  to: string;
  body: string;
  previewUrl?: boolean;
}

export type SendResult =
  | { ok: true; messageId: string; to: string }
  | { ok: false; error: string; code?: number };

/** Build the Cloud API payload for a template message (exported for tests). */
export function buildTemplatePayload(input: SendTemplateInput, to: string) {
  const template: Record<string, unknown> = {
    name: input.templateName,
    language: { code: input.languageCode ?? "en" },
  };
  if (input.components && input.components.length > 0) {
    template.components = input.components;
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template,
  };
}

export function buildTextPayload(input: SendTextInput, to: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: input.previewUrl ?? false, body: input.body },
  };
}

async function postMessage(
  conn: Pick<WhatsAppConnection, "phoneNumberId" | "accessToken">,
  payload: unknown
): Promise<SendResult> {
  const to = (payload as { to: string }).to;
  try {
    const res = await fetch(`${GRAPH_BASE}/${conn.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string; code?: number };
    };
    if (!res.ok) {
      return {
        ok: false,
        error: body.error?.message ?? `WhatsApp send failed (${res.status})`,
        code: body.error?.code,
      };
    }
    const id = body.messages?.[0]?.id;
    if (!id) return { ok: false, error: "WhatsApp returned no message id" };
    return { ok: true, messageId: id, to };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WhatsApp send failed" };
  }
}

/**
 * Send an approved template. This is the only kind of message a business
 * may start a conversation with (outside a 24-hour reply window).
 */
export async function sendTemplateMessage(
  conn: Pick<WhatsAppConnection, "phoneNumberId" | "accessToken">,
  input: SendTemplateInput
): Promise<SendResult> {
  const to = normalisePhone(input.to);
  if (!to) return { ok: false, error: "That phone number does not look valid" };
  if (!input.templateName) return { ok: false, error: "Template name is required" };
  return postMessage(conn, buildTemplatePayload(input, to));
}

/** Free-form text. Only delivered inside a 24-hour customer service window. */
export async function sendTextMessage(
  conn: Pick<WhatsAppConnection, "phoneNumberId" | "accessToken">,
  input: SendTextInput
): Promise<SendResult> {
  const to = normalisePhone(input.to);
  if (!to) return { ok: false, error: "That phone number does not look valid" };
  if (!input.body?.trim()) return { ok: false, error: "Message text is required" };
  return postMessage(conn, buildTextPayload(input, to));
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/**
 * Meta's verification handshake: respond with hub.challenge when the mode
 * is "subscribe" and the token matches WHATSAPP_VERIFY_TOKEN.
 */
export function verifyWebhookHandshake(
  params: { mode: string | null; token: string | null; challenge: string | null },
  verifyToken: string | undefined = process.env.WHATSAPP_VERIFY_TOKEN
): { ok: true; challenge: string } | { ok: false; status: number; reason: string } {
  if (!verifyToken) {
    return { ok: false, status: 503, reason: "WHATSAPP_VERIFY_TOKEN is not set" };
  }
  if (params.mode !== "subscribe") {
    return { ok: false, status: 400, reason: "Unexpected hub.mode" };
  }
  if (!params.token || params.token !== verifyToken) {
    return { ok: false, status: 403, reason: "Verify token does not match" };
  }
  if (!params.challenge) {
    return { ok: false, status: 400, reason: "Missing hub.challenge" };
  }
  return { ok: true, challenge: params.challenge };
}

/** Check X-Hub-Signature-256 ("sha256=<hex>") against the raw body. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined = process.env.FACEBOOK_APP_SECRET
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type WhatsAppStatus = "sent" | "delivered" | "read" | "failed";

export interface ParsedStatus {
  phoneNumberId: string;
  messageId: string;
  status: WhatsAppStatus;
  recipient: string;
  occurredAt: string;
  error: string | null;
  raw: Record<string, unknown>;
}

export interface ParsedInbound {
  phoneNumberId: string;
  messageId: string;
  from: string;
  name: string | null;
  type: string;
  text: string | null;
  occurredAt: string;
  raw: Record<string, unknown>;
}

export interface ParsedWebhook {
  statuses: ParsedStatus[];
  messages: ParsedInbound[];
}

function tsToIso(ts: unknown): string {
  const n = Number(ts);
  if (Number.isFinite(n) && n > 0) return new Date(n * 1000).toISOString();
  return new Date().toISOString();
}

/**
 * Flatten Meta's entry/changes/value shape into statuses and inbound
 * messages. Unknown shapes are ignored, never thrown.
 */
export function parseWebhookPayload(body: unknown): ParsedWebhook {
  const out: ParsedWebhook = { statuses: [], messages: [] };
  const root = body as { object?: string; entry?: unknown[] } | null;
  if (!root || root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) {
    return out;
  }
  for (const entry of root.entry as Array<{ changes?: unknown[] }>) {
    for (const change of (entry?.changes ?? []) as Array<{ field?: string; value?: Record<string, unknown> }>) {
      if (change?.field && change.field !== "messages") continue;
      const value = change?.value ?? {};
      const phoneNumberId = String(
        (value.metadata as { phone_number_id?: string } | undefined)?.phone_number_id ?? ""
      );
      if (!phoneNumberId) continue;

      const contacts = (value.contacts ?? []) as Array<{ wa_id?: string; profile?: { name?: string } }>;
      const nameByWaId = new Map<string, string>();
      for (const c of contacts) {
        if (c.wa_id && c.profile?.name) nameByWaId.set(c.wa_id, c.profile.name);
      }

      for (const s of (value.statuses ?? []) as Array<Record<string, unknown>>) {
        const status = String(s.status ?? "");
        if (!["sent", "delivered", "read", "failed"].includes(status)) continue;
        const errors = s.errors as Array<{ title?: string; message?: string }> | undefined;
        out.statuses.push({
          phoneNumberId,
          messageId: String(s.id ?? ""),
          status: status as WhatsAppStatus,
          recipient: String(s.recipient_id ?? ""),
          occurredAt: tsToIso(s.timestamp),
          error: errors?.[0]?.message ?? errors?.[0]?.title ?? null,
          raw: s,
        });
      }

      for (const m of (value.messages ?? []) as Array<Record<string, unknown>>) {
        const from = String(m.from ?? "");
        const type = String(m.type ?? "unknown");
        const text =
          type === "text"
            ? ((m.text as { body?: string } | undefined)?.body ?? null)
            : type === "button"
              ? ((m.button as { text?: string } | undefined)?.text ?? null)
              : type === "interactive"
                ? (((m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } } | undefined)
                    ?.button_reply?.title) ??
                  ((m.interactive as { list_reply?: { title?: string } } | undefined)?.list_reply?.title) ??
                  null)
                : null;
        out.messages.push({
          phoneNumberId,
          messageId: String(m.id ?? ""),
          from,
          name: nameByWaId.get(from) ?? null,
          type,
          text,
          occurredAt: tsToIso(m.timestamp),
          raw: m,
        });
      }
    }
  }
  return out;
}

const OPT_OUT_WORDS = new Set([
  "stop",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "opt out",
  "optout",
  "remove me",
  "no more",
]);

/** "STOP", "stop please", "Unsubscribe." all count as opt-out. */
export function isOptOutMessage(text: string | null | undefined): boolean {
  if (!text) return false;
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  if (OPT_OUT_WORDS.has(cleaned)) return true;
  const first = cleaned.split(" ")[0];
  if (OPT_OUT_WORDS.has(first)) return true;
  return Array.from(OPT_OUT_WORDS).some((w) => w.includes(" ") && cleaned.startsWith(w));
}

// ---------------------------------------------------------------------------
// Recording events (service role)
// ---------------------------------------------------------------------------

export interface RecordEventInput {
  projectId: string;
  direction: "outbound" | "inbound";
  eventType: "sent" | "delivered" | "read" | "failed" | "received" | "opted_out";
  contactId?: string | null;
  enrollmentId?: string | null;
  waMessageId?: string | null;
  phone?: string | null;
  body?: string | null;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

/** Insert one whatsapp_events row; duplicates (same message id + type) are ignored. */
export async function recordWhatsAppEvent(db: Db, input: RecordEventInput): Promise<void> {
  const { error } = await db.from("whatsapp_events").insert({
    project_id: input.projectId,
    direction: input.direction,
    event_type: input.eventType,
    contact_id: input.contactId ?? null,
    enrollment_id: input.enrollmentId ?? null,
    wa_message_id: input.waMessageId ?? null,
    phone: input.phone ?? null,
    body: input.body ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    metadata: input.metadata ?? {},
  });
  if (error && error.code !== "23505") {
    console.error("[whatsapp] could not record event:", error.message);
  }
}

/** Find a contact in any of the project's audiences by phone. */
export async function findContactByPhone(
  db: Db,
  projectId: string,
  phone: string
): Promise<{ id: string; audience_id: string } | null> {
  const normalised = normalisePhone(phone);
  if (!normalised) return null;
  const { data: audiences } = await db
    .from("audiences")
    .select("id")
    .eq("project_id", projectId);
  const audienceIds = (audiences ?? []).map((a) => a.id as string);
  if (audienceIds.length === 0) return null;
  const { data } = await db
    .from("audience_contacts")
    .select("id, audience_id")
    .in("audience_id", audienceIds)
    .eq("phone", normalised)
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id as string, audience_id: data.audience_id as string } : null;
}

/**
 * Apply one parsed webhook to the database: statuses become events on the
 * matching outbound message; inbound messages are stored and "STOP" turns
 * the contact's WhatsApp consent off. Returns counts for the route's log.
 */
export async function applyWebhook(
  db: Db,
  parsed: ParsedWebhook
): Promise<{ statuses: number; messages: number; optOuts: number; unknownNumbers: number }> {
  const counts = { statuses: 0, messages: 0, optOuts: 0, unknownNumbers: 0 };
  const projectCache = new Map<string, string | null>();
  const projectFor = async (phoneNumberId: string) => {
    if (!projectCache.has(phoneNumberId)) {
      projectCache.set(phoneNumberId, await findProjectByPhoneNumberId(db, phoneNumberId));
    }
    return projectCache.get(phoneNumberId) ?? null;
  };

  for (const s of parsed.statuses) {
    const projectId = await projectFor(s.phoneNumberId);
    if (!projectId) {
      counts.unknownNumbers++;
      continue;
    }
    // Carry the contact/enrollment over from the original 'sent' row.
    const { data: sentRow } = await db
      .from("whatsapp_events")
      .select("contact_id, enrollment_id")
      .eq("wa_message_id", s.messageId)
      .eq("event_type", "sent")
      .maybeSingle();
    await recordWhatsAppEvent(db, {
      projectId,
      direction: "outbound",
      eventType: s.status,
      contactId: (sentRow?.contact_id as string | null) ?? null,
      enrollmentId: (sentRow?.enrollment_id as string | null) ?? null,
      waMessageId: s.messageId,
      phone: s.recipient || null,
      body: s.error,
      occurredAt: s.occurredAt,
      metadata: { raw: s.raw },
    });
    counts.statuses++;
  }

  for (const m of parsed.messages) {
    const projectId = await projectFor(m.phoneNumberId);
    if (!projectId) {
      counts.unknownNumbers++;
      continue;
    }
    const contact = await findContactByPhone(db, projectId, m.from);
    await recordWhatsAppEvent(db, {
      projectId,
      direction: "inbound",
      eventType: "received",
      contactId: contact?.id ?? null,
      waMessageId: m.messageId,
      phone: m.from,
      body: m.text,
      occurredAt: m.occurredAt,
      metadata: { type: m.type, name: m.name, raw: m.raw },
    });
    counts.messages++;

    if (isOptOutMessage(m.text)) {
      if (contact) {
        await db
          .from("audience_contacts")
          .update({ whatsapp_opt_in: false, updated_at: new Date().toISOString() })
          .eq("id", contact.id);
        // Stop any running WhatsApp sequence steps for this contact.
        await db
          .from("email_sequence_enrollments")
          .update({ status: "cancelled", cancellation_reason: "whatsapp_opt_out" })
          .eq("contact_id", contact.id)
          .eq("status", "active");
      }
      await recordWhatsAppEvent(db, {
        projectId,
        direction: "inbound",
        eventType: "opted_out",
        contactId: contact?.id ?? null,
        waMessageId: m.messageId,
        phone: m.from,
        body: m.text,
        occurredAt: m.occurredAt,
      });
      counts.optOuts++;
    }
  }

  return counts;
}

/** Convenience for callers that only have a project id. */
export async function sendForProject(
  projectId: string,
  message: { template?: SendTemplateInput; text?: SendTextInput },
  db: Db = createServiceClient()
): Promise<SendResult> {
  const conn = await getWhatsAppConnection(db, projectId);
  if (!conn) return { ok: false, error: WHATSAPP_NOT_CONNECTED_MESSAGE };
  if (message.template) return sendTemplateMessage(conn, message.template);
  if (message.text) return sendTextMessage(conn, message.text);
  return { ok: false, error: "Nothing to send" };
}
