import crypto from "node:crypto";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enrollContactInSequence } from "./enroll";
import { createContact } from "./marketing";
import { resolveSenderAddress } from "./sender";

// Double opt-in. A contact who joins a list with double_opt_in on starts
// as 'pending' with a one-time confirm token. We email them a link to
// /confirm?token=...; opening it flips them to 'subscribed', records
// confirmed_at, mirrors them into Resend and enrols them in whatever
// email series the sign-up form promised.
//
// Tokens are random (32 bytes, hex) and stored on the row, like
// unsubscribe_token. They expire after CONFIRM_TTL_DAYS from
// confirm_sent_at so an old sign-up can't be confirmed months later.
// The token stays on the row after confirming: it can only ever flip a
// 'pending' contact, so a used token is harmless, and the /confirm page
// needs it to find the owner's brand after /api/confirm redirects back.

export const CONFIRM_TTL_DAYS = 14;
const TOKEN_RE = /^[a-f0-9]{64}$/;

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://conduikt.com";
}

export function generateConfirmToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Shape check only: the real check is the DB lookup. */
export function isWellFormedConfirmToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

export function buildConfirmUrl(token: string): string {
  return `${appUrl()}/confirm?token=${encodeURIComponent(token)}`;
}

export function isConfirmTokenExpired(
  sentAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sentAt) return false;
  const sent = typeof sentAt === "string" ? new Date(sentAt) : sentAt;
  if (Number.isNaN(sent.getTime())) return false;
  return now.getTime() - sent.getTime() > CONFIRM_TTL_DAYS * 86_400_000;
}

// ---------------------------------------------------------------------------
// Confirmation email
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function confirmationEmailHtml(input: { brandName: string; confirmUrl: string }): string {
  const brand = escapeHtml(input.brandName);
  const url = input.confirmUrl.replace(/"/g, "%22");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Please confirm your email</title></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">
        <tr><td style="padding:0 0 16px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">One more step: confirm your email</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">You asked to get emails from ${brand}. Click the button below to confirm it was you.</p>
          <table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="border-radius:6px;">
            <a href="${url}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;text-decoration:underline;">Yes, send me emails</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;">If the button doesn't work, copy this link into your browser:<br><a href="${url}" style="word-break:break-all;">${url}</a></p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;">Didn't sign up? Ignore this email and you won't hear from us again. The link stops working after ${CONFIRM_TTL_DAYS} days.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function confirmationEmailText(input: { brandName: string; confirmUrl: string }): string {
  return [
    "One more step: confirm your email",
    "",
    `You asked to get emails from ${input.brandName}. Open this link to confirm it was you:`,
    input.confirmUrl,
    "",
    `Didn't sign up? Ignore this email and you won't hear from us again. The link stops working after ${CONFIRM_TTL_DAYS} days.`,
  ].join("\n");
}

export interface SendConfirmationInput {
  to: string;
  from: string; // "Brand <addr>"
  brandName: string;
  confirmUrl: string;
  replyTo?: string;
}

export async function sendConfirmationEmail(
  input: SendConfirmationInput
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: input.from,
      to: [input.to],
      subject: `Please confirm: emails from ${input.brandName}`,
      html: confirmationEmailHtml({ brandName: input.brandName, confirmUrl: input.confirmUrl }),
      text: confirmationEmailText({ brandName: input.brandName, confirmUrl: input.confirmUrl }),
      replyTo: input.replyTo,
      tags: [{ name: "type", value: "double_opt_in" }],
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown Resend error" };
  }
}

// ---------------------------------------------------------------------------
// Start: mark pending + send the email
// ---------------------------------------------------------------------------

export interface BeginConfirmationInput {
  contactId: string;
  email: string;
  userId: string;
  /** Shown as the sender name and inside the email. */
  brandName: string;
  replyTo?: string | null;
}

/**
 * Issues a fresh token for a pending contact and emails it. Safe to call
 * again for the same contact (re-sends with a new token).
 */
export async function beginConfirmation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  input: BeginConfirmationInput
): Promise<{ ok: boolean; error?: string }> {
  const token = generateConfirmToken();
  const { error } = await supabase
    .from("audience_contacts")
    .update({ confirm_token: token, confirm_sent_at: new Date().toISOString() })
    .eq("id", input.contactId);
  if (error) return { ok: false, error: error.message };

  const sender = await resolveSenderAddress(supabase, input.userId, input.brandName);
  return sendConfirmationEmail({
    to: input.email,
    from: sender.from,
    brandName: input.brandName,
    confirmUrl: buildConfirmUrl(token),
    replyTo: input.replyTo ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Finish: flip to subscribed + enrol
// ---------------------------------------------------------------------------

export type ConfirmOutcome =
  | { ok: true; state: "confirmed" | "already"; email: string; contactId: string }
  | { ok: false; state: "invalid" | "expired" | "not_pending" | "error"; error?: string };

export async function confirmContactByToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  token: string
): Promise<ConfirmOutcome> {
  if (!isWellFormedConfirmToken(token)) return { ok: false, state: "invalid" };

  const { data: contact, error } = await supabase
    .from("audience_contacts")
    .select(
      "id, email, first_name, last_name, status, audience_id, confirm_sent_at, pending_sequence_id, resend_contact_id"
    )
    .eq("confirm_token", token)
    .maybeSingle();

  if (error) return { ok: false, state: "error", error: error.message };
  if (!contact) return { ok: false, state: "invalid" };

  if (contact.status === "subscribed") {
    // Confirmed earlier (or the owner marked them subscribed): nothing to flip.
    return { ok: true, state: "already", email: contact.email, contactId: contact.id };
  }
  if (contact.status !== "pending") {
    // Unsubscribed, suppressed, bounced or complained since the link was
    // sent. A public link must never undo that, and we don't tell them
    // they're subscribed when they aren't.
    return { ok: false, state: "not_pending" };
  }
  if (isConfirmTokenExpired(contact.confirm_sent_at)) {
    return { ok: false, state: "expired" };
  }

  const { data: audience } = await supabase
    .from("audiences")
    .select("id, user_id, resend_audience_id")
    .eq("id", contact.audience_id)
    .maybeSingle();

  // Mirror into Resend now, not at sign-up: pending people must never be
  // in the Resend audience or a one-off email would reach them.
  let resendContactId: string | null = contact.resend_contact_id ?? null;
  if (!resendContactId && audience?.resend_audience_id) {
    const mirrored = await createContact(audience.resend_audience_id, {
      email: contact.email,
      first_name: contact.first_name ?? undefined,
      last_name: contact.last_name ?? undefined,
    });
    if (mirrored.ok) resendContactId = mirrored.data.id;
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("audience_contacts")
    .update({
      status: "subscribed",
      confirmed_at: nowIso,
      subscribed_at: nowIso,
      pending_sequence_id: null,
      resend_contact_id: resendContactId,
    })
    .eq("id", contact.id)
    .eq("status", "pending");
  if (upErr) return { ok: false, state: "error", error: upErr.message };

  if (contact.pending_sequence_id && audience?.user_id) {
    await enrollContactInSequence(supabase, {
      userId: audience.user_id,
      sequenceId: contact.pending_sequence_id,
      contactId: contact.id,
      audienceId: contact.audience_id,
    });
  }

  return { ok: true, state: "confirmed", email: contact.email, contactId: contact.id };
}
