import { Resend } from "resend";
import { buildUnsubscribeUrl, injectUnsubscribeIntoHtml } from "./unsubscribe";

// Per-contact transactional send used by the email-sequence-step handler.
// Distinct from the broadcast send path (which uses Resend's hosted
// audience + {{{RESEND_UNSUBSCRIBE_URL}}} variable) — sequence steps go
// through `emails.send()` so each step can fire on its own delay and only
// to one recipient.
//
// Compliance: every send must include a working unsubscribe URL. We build
// it from the contact's `unsubscribe_token` (lives in audience_contacts)
// and set both:
//   - Inline link in the HTML body (visible to users)
//   - `List-Unsubscribe` + `List-Unsubscribe-Post` headers (RFC 8058
//     one-click — Gmail/Apple Mail show the "Unsubscribe" button at the
//     top of the message).

export interface SequenceSendInput {
  to: string;
  subject: string;
  html: string;
  // The audience_contacts.unsubscribe_token used to revoke consent.
  unsubscribeToken: string;
  from: string;       // "Display Name <user@domain.com>"
  replyTo?: string;
  // Optional Resend tags so webhook events can be attributed back.
  tags?: { name: string; value: string }[];
}

export interface SequenceSendResult {
  ok: boolean;
  resendEmailId?: string;
  error?: string;
}

export async function sendSequenceEmail(
  input: SequenceSendInput
): Promise<SequenceSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(input.unsubscribeToken);
  const html = injectUnsubscribeIntoHtml(input.html, unsubscribeUrl);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html,
      replyTo: input.replyTo,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: input.tags,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, resendEmailId: data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown Resend error",
    };
  }
}
