import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/src/lib/supabase/service";

// Resend webhook handler. Resend uses Svix for delivery + signing.
//
// Headers:
//   svix-id          unique event id (idempotency key)
//   svix-timestamp   unix seconds
//   svix-signature   one or more signatures, space-separated, format
//                    "v1,<base64-hmac-sha256>". We pass when ANY one
//                    matches — Svix rotates keys this way.
//
// Signed payload: `${svix-id}.${svix-timestamp}.${rawBody}`
//
// Configure RESEND_WEBHOOK_SECRET in Vercel env. Without it set, in
// production we 500 (fail closed). In dev we accept unsigned events
// with a warning so local testing isn't blocked on secret-shuffling.

const TOLERANCE_SECONDS = 300; // 5 min

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  signatureHeader: string,
  body: string
): boolean {
  // Reject events older than the tolerance window — replay protection.
  const ts = parseInt(svixTimestamp, 10);
  if (Number.isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  // Resend's signing secret is base64-encoded with a "whsec_" prefix.
  // Strip the prefix before treating it as bytes.
  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(keyB64, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", keyBuffer)
    .update(signedPayload)
    .digest("base64");

  // The header may carry multiple signatures (key rotation); accept any match.
  for (const part of signatureHeader.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    if (timingSafeEqualStrings(sig, expected)) return true;
  }
  return false;
}

interface ResendWebhookData {
  broadcast_id?: string;
  email_id?: string;
  to?: string | string[];
  from?: string;
  subject?: string;
  click?: { link?: string };
  bounce?: { type?: string; message?: string };
  // contact.* events
  id?: string;          // Resend contact id
  email?: string;       // contact email
  audience_id?: string; // Resend audience id
  unsubscribed?: boolean;
  // Many other fields may be present depending on event type — we capture
  // the lot via metadata: jsonb.
  [key: string]: unknown;
}

interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data?: ResendWebhookData;
}

const EVENT_TO_DB: Record<string, string | null> = {
  "email.sent": null, // not interesting on its own — we already mark sent
  "email.delivered": "delivered",
  "email.delivery_delayed": null,
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

// Events that should suppress the contact (no further sends to this address).
const SUPPRESSING_EVENTS = new Set(["email.bounced", "email.complained"]);

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[webhooks/resend] RESEND_WEBHOOK_SECRET not set — refusing to accept events. Set it in Vercel env vars."
      );
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }
    console.warn(
      "[webhooks/resend] RESEND_WEBHOOK_SECRET not set — accepting unsigned event (dev only)"
    );
  }

  const rawBody = await request.text();

  if (secret) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing svix headers" }, { status: 401 });
    }
    if (!verifySignature(secret, svixId, svixTimestamp, svixSignature, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Contact events: Resend fires contact.updated when a recipient clicks
  // the unsubscribe link in their hosted unsubscribe page. Sync to our DB.
  if (event.type === "contact.updated" || event.type === "contact.deleted") {
    return await handleContactEvent(event, svixId);
  }

  const dbEventType = EVENT_TO_DB[event.type];
  if (!dbEventType) {
    // Unhandled event types ack-200 silently — Resend retries on non-2xx.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const data = event.data ?? {};
  const resendBroadcastId =
    typeof data.broadcast_id === "string" ? data.broadcast_id : null;
  const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to ?? null;

  if (!resendBroadcastId) {
    // Event isn't tied to a Conduikt broadcast (e.g., transactional email
    // event slipping through the same webhook). Ignore.
    return NextResponse.json({ ok: true, ignored: "no broadcast_id" });
  }

  const supabase = createServiceClient();

  // Look up the Conduikt broadcast.
  const { data: broadcast } = await supabase
    .from("broadcasts")
    .select("id, audience_id, totals")
    .eq("resend_broadcast_id", resendBroadcastId)
    .maybeSingle();
  if (!broadcast) {
    // Race or unrelated broadcast. Ack to stop retries.
    return NextResponse.json({ ok: true, ignored: "broadcast not in conduikt" });
  }

  // Resolve contact_id by email + audience (best-effort; null is fine).
  let contactId: string | null = null;
  if (recipientEmail) {
    const { data: contact } = await supabase
      .from("audience_contacts")
      .select("id")
      .eq("audience_id", broadcast.audience_id)
      .eq("email", recipientEmail.toLowerCase())
      .maybeSingle();
    contactId = contact?.id ?? null;
  }

  // Idempotent insert — the unique index on resend_event_id deduplicates
  // retries from Svix. We don't blow up on conflict.
  const { error: insertErr } = await supabase
    .from("email_events")
    .insert({
      broadcast_id: broadcast.id,
      contact_id: contactId,
      event_type: dbEventType,
      occurred_at: event.created_at ?? new Date().toISOString(),
      metadata: data as Record<string, unknown>,
      resend_event_id: svixId,
    });

  // Postgres unique-violation = duplicate webhook delivery, which is fine.
  if (insertErr && insertErr.code !== "23505") {
    console.error("[webhooks/resend] insert error:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  if (insertErr?.code === "23505") {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Bump aggregate counter on the broadcast row.
  const totals = (broadcast.totals as Record<string, number>) ?? {};
  totals[dbEventType] = (totals[dbEventType] ?? 0) + 1;
  await supabase.from("broadcasts").update({ totals }).eq("id", broadcast.id);

  // Suppress the contact on bounce/complaint so we never send to them again.
  if (SUPPRESSING_EVENTS.has(event.type) && contactId) {
    const status = event.type === "email.complained" ? "complained" : "bounced";
    await supabase
      .from("audience_contacts")
      .update({
        status,
        suppression_reason: status,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", contactId);
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// contact.updated / contact.deleted
//
// Fires when a recipient clicks Resend's hosted one-click unsubscribe link
// (the {{{RESEND_UNSUBSCRIBE_URL}}} we inject into broadcast HTML), or
// when a contact is removed via Resend dashboard. We mirror the change
// into our audience_contacts row so future sends skip them.
// ---------------------------------------------------------------------------
async function handleContactEvent(event: ResendWebhookEvent, svixId: string | null) {
  const data = event.data ?? {};
  const resendContactId = typeof data.id === "string" ? data.id : null;
  const email = typeof data.email === "string" ? data.email.toLowerCase() : null;
  if (!resendContactId && !email) {
    return NextResponse.json({ ok: true, ignored: "no contact identity" });
  }

  const supabase = createServiceClient();

  // Locate our contact row by resend_contact_id first (most reliable),
  // falling back to email if the resend id wasn't synced when the contact
  // was created (best-effort fallback for orphaned mirrors).
  let contactQuery = supabase
    .from("audience_contacts")
    .select("id, audience_id, status");
  if (resendContactId) {
    contactQuery = contactQuery.eq("resend_contact_id", resendContactId);
  } else if (email) {
    contactQuery = contactQuery.eq("email", email);
  }
  const { data: contact } = await contactQuery.maybeSingle();
  if (!contact) {
    return NextResponse.json({ ok: true, ignored: "contact not in conduikt" });
  }

  if (event.type === "contact.deleted") {
    // Hard delete on Resend side → soft-delete on ours (mark unsubscribed
    // with reason so analytics retain the row but we never send to them).
    await supabase
      .from("audience_contacts")
      .update({
        status: "unsubscribed",
        suppression_reason: "manual",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", contact.id);
    return NextResponse.json({ ok: true, action: "soft-deleted" });
  }

  // contact.updated — only act if the unsubscribe state changed.
  const nowUnsubscribed = data.unsubscribed === true;
  const wasUnsubscribed = contact.status === "unsubscribed";
  if (nowUnsubscribed && !wasUnsubscribed) {
    await supabase
      .from("audience_contacts")
      .update({
        status: "unsubscribed",
        suppression_reason: "manual",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    // Also append an email_events row so per-broadcast unsubscribe rates
    // can be computed. We don't have broadcast_id from contact.updated,
    // so leave that null — analytics queries that need broadcast attribution
    // can correlate by occurred_at and contact_id.
    await supabase.from("email_events").insert({
      broadcast_id: null,
      contact_id: contact.id,
      event_type: "unsubscribed",
      occurred_at: event.created_at ?? new Date().toISOString(),
      metadata: data as Record<string, unknown>,
      resend_event_id: svixId,
    }).then(() => {}, () => {}); // unique-violation tolerant

    return NextResponse.json({ ok: true, action: "unsubscribed" });
  } else if (!nowUnsubscribed && wasUnsubscribed) {
    // Re-subscribe — rare, but possible if the user fixes their unsubscribe.
    await supabase
      .from("audience_contacts")
      .update({
        status: "subscribed",
        suppression_reason: null,
        unsubscribed_at: null,
      })
      .eq("id", contact.id);
    return NextResponse.json({ ok: true, action: "resubscribed" });
  }

  // No state change → no-op.
  return NextResponse.json({ ok: true, action: "no-change" });
}
