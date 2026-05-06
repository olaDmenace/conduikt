import type { SupabaseClient } from "@supabase/supabase-js";

// Per-contact unsubscribe URL helpers used by sequence sends + any other
// transactional path that needs a custom unsubscribe link (broadcasts use
// Resend's hosted {{{RESEND_UNSUBSCRIBE_URL}}} variable instead).

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://conduikt.com";
}

export function buildUnsubscribeUrl(token: string): string {
  return `${appUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

// Substitutes the unsubscribe URL into an email body. Mirrors the
// behaviour of `ensureUnsubscribeFooter` (broadcast variant) but with a
// real per-contact URL instead of Resend's broadcast placeholder.
//
// Order of operations:
// 1. If the body contains `{{{RESEND_UNSUBSCRIBE_URL}}}`, replace it with
//    the per-contact URL — the AI agent's templates may include it.
// 2. Otherwise inject a small footer above </body> (or at the end).
export function injectUnsubscribeIntoHtml(
  html: string,
  unsubscribeUrl: string
): string {
  const placeholder = /\{\{\{?RESEND_UNSUBSCRIBE_URL\}?\}\}/g;
  if (placeholder.test(html)) {
    return html.replace(placeholder, unsubscribeUrl);
  }
  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e0db;color:#8a8176;font-size:12px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <p style="margin:0;">You're receiving this because you subscribed to our list. <a href="${unsubscribeUrl}" style="color:#1F6B66;text-decoration:underline;">Unsubscribe</a>.</p>
</div>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}\n</body>`);
  }
  return html + footer;
}

// Marks a contact as unsubscribed and cancels any active enrollments they
// have. Used by both the human-confirm page POST and the one-click
// List-Unsubscribe handler.
//
// Returns true if state changed, false if the contact was already
// unsubscribed (idempotent).
export async function unsubscribeContactByToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  token: string
): Promise<{ ok: boolean; alreadyUnsubscribed: boolean; error?: string }> {
  if (!token || typeof token !== "string") {
    return { ok: false, alreadyUnsubscribed: false, error: "Missing token" };
  }
  const { data: contact, error } = await supabase
    .from("audience_contacts")
    .select("id, audience_id, status, resend_contact_id")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) {
    return { ok: false, alreadyUnsubscribed: false, error: error.message };
  }
  if (!contact) {
    return { ok: false, alreadyUnsubscribed: false, error: "Invalid token" };
  }
  if (contact.status === "unsubscribed") {
    return { ok: true, alreadyUnsubscribed: true };
  }

  await supabase
    .from("audience_contacts")
    .update({
      status: "unsubscribed",
      suppression_reason: "manual",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  // Cancel any in-flight sequence enrollments for this contact so the
  // scheduler doesn't keep firing steps at them. Each row's status check
  // in the handler would also short-circuit, but nuking it here saves
  // pointless ticks.
  await supabase
    .from("email_sequence_enrollments")
    .update({
      status: "cancelled",
      cancellation_reason: "unsubscribed",
    })
    .eq("contact_id", contact.id)
    .eq("status", "active");

  return { ok: true, alreadyUnsubscribed: false };
}
