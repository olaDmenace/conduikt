// Resend Marketing API wrapper — Audiences, Contacts, Broadcasts, Domains.
//
// Separate from src/lib/email/index.ts (transactional). Both use the same
// Resend account and the same RESEND_API_KEY env var, but the surfaces
// don't overlap: transactional uses the `emails.send()` API, marketing
// uses `audiences`, `contacts`, `broadcasts`, and `domains`.
//
// Sender domain: marketing sends from `mail.conduikt.com` (subdomain of
// the existing transactional domain). Keeping marketing reputation
// isolated from transactional reputation is the canonical Resend setup.
//
// Every wrapper returns { ok, data?, error? } rather than throwing — the
// callers (API routes) need to translate Resend errors into HTTP responses
// and write user-friendly messages, not propagate raw exceptions.

import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResendResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface MarketingAudience {
  id: string;
  name: string;
  created_at: string;
}

export interface MarketingContact {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  unsubscribed: boolean;
}

export interface MarketingDomain {
  id: string;
  name: string;
  status: "pending" | "verified" | "failed" | "not_started" | string;
  records: Array<{
    record: string; // 'SPF' | 'DKIM' | 'DMARC' | 'MX' ...
    name: string;
    type: string;  // 'TXT' | 'MX' | 'CNAME'
    value: string;
    ttl?: string | number;
    priority?: number;
    status?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(key);
}

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    return e.message;
  }
  return "Unknown Resend error";
}

// ---------------------------------------------------------------------------
// Audiences
// ---------------------------------------------------------------------------

export async function createAudience(name: string): Promise<ResendResult<MarketingAudience>> {
  try {
    const { data, error } = await client().audiences.create({ name });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Resend returned no audience data" };
    // The SDK's CreateSegmentResponseSuccess doesn't always expose created_at,
    // so derive it on our side. We persist Conduikt's own timestamp anyway.
    return {
      ok: true,
      data: {
        id: data.id,
        name: data.name,
        created_at: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteAudience(audienceId: string): Promise<ResendResult<true>> {
  try {
    const { error } = await client().audiences.remove(audienceId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function createContact(
  audienceId: string,
  contact: { email: string; first_name?: string; last_name?: string; unsubscribed?: boolean }
): Promise<ResendResult<MarketingContact>> {
  try {
    const { data, error } = await client().contacts.create({
      audienceId,
      email: contact.email,
      firstName: contact.first_name,
      lastName: contact.last_name,
      unsubscribed: contact.unsubscribed ?? false,
    });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Resend returned no contact data" };
    return {
      ok: true,
      data: {
        id: data.id,
        email: contact.email,
        first_name: contact.first_name ?? null,
        last_name: contact.last_name ?? null,
        unsubscribed: contact.unsubscribed ?? false,
      },
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateContactStatus(
  audienceId: string,
  resendContactId: string,
  unsubscribed: boolean
): Promise<ResendResult<true>> {
  try {
    const { error } = await client().contacts.update({
      audienceId,
      id: resendContactId,
      unsubscribed,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function removeContact(
  audienceId: string,
  resendContactId: string
): Promise<ResendResult<true>> {
  try {
    const { error } = await client().contacts.remove({ audienceId, id: resendContactId });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

export interface CreateBroadcastInput {
  audienceId: string;
  subject: string;
  html: string;
  text?: string;
  from: string;       // "Display Name <user@domain.com>"
  replyTo?: string;
  scheduledAt?: string; // ISO 8601 — null/undefined = send immediately on send()
  name?: string;        // Internal name for Resend dashboard
}

export async function createBroadcast(
  input: CreateBroadcastInput
): Promise<ResendResult<{ id: string }>> {
  try {
    // Resend's TS types insist text is a string and use a discriminated
    // union for audienceId vs segmentId. We always send to an audience;
    // cast bypasses the union narrowing without affecting runtime — the
    // API accepts the audienceId form.
    const params = {
      audienceId: input.audienceId,
      subject: input.subject,
      html: input.html,
      text: input.text ?? "",
      from: input.from,
      replyTo: input.replyTo,
      scheduledAt: input.scheduledAt,
      name: input.name ?? input.subject.slice(0, 80),
    };
    const { data, error } = await client().broadcasts.create(
      params as Parameters<Resend["broadcasts"]["create"]>[0]
    );
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Resend returned no broadcast data" };
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function sendBroadcast(
  broadcastId: string,
  scheduledAt?: string
): Promise<ResendResult<true>> {
  try {
    const { error } = await client().broadcasts.send(broadcastId, { scheduledAt });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export async function createDomain(name: string): Promise<ResendResult<MarketingDomain>> {
  try {
    const { data, error } = await client().domains.create({ name });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Resend returned no domain data" };
    // The shape of `records` differs slightly across SDK versions; coerce
    // into our MarketingDomain shape.
    // The SDK's DomainRecords union has variant-specific fields (ttl, priority,
    // value, etc. only on some shapes). We coerce every variant to a flat
    // string-keyed record for our own UI, which doesn't care about the union.
    const records =
      "records" in data && Array.isArray(data.records)
        ? data.records.map((rec) => {
            const r = rec as unknown as Record<string, unknown>;
            return {
              record: String(r.record ?? ""),
              name: String(r.name ?? ""),
              type: String(r.type ?? ""),
              value: String(r.value ?? ""),
              ttl: r.ttl as string | number | undefined,
              priority: r.priority as number | undefined,
              status: r.status as string | undefined,
            };
          })
        : [];
    return {
      ok: true,
      data: {
        id: data.id,
        name: data.name,
        status: (data.status as string) ?? "pending",
        records,
      },
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getDomain(domainId: string): Promise<ResendResult<MarketingDomain>> {
  try {
    const { data, error } = await client().domains.get(domainId);
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Resend returned no domain data" };
    // The SDK's DomainRecords union has variant-specific fields (ttl, priority,
    // value, etc. only on some shapes). We coerce every variant to a flat
    // string-keyed record for our own UI, which doesn't care about the union.
    const records =
      "records" in data && Array.isArray(data.records)
        ? data.records.map((rec) => {
            const r = rec as unknown as Record<string, unknown>;
            return {
              record: String(r.record ?? ""),
              name: String(r.name ?? ""),
              type: String(r.type ?? ""),
              value: String(r.value ?? ""),
              ttl: r.ttl as string | number | undefined,
              priority: r.priority as number | undefined,
              status: r.status as string | undefined,
            };
          })
        : [];
    return {
      ok: true,
      data: {
        id: data.id,
        name: data.name,
        status: (data.status as string) ?? "pending",
        records,
      },
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function verifyDomain(domainId: string): Promise<ResendResult<true>> {
  try {
    const { error } = await client().domains.verify(domainId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

// Conduikt's own marketing sender. Sends from `contacts.conduikt.com`,
// the subdomain that's verified in Resend. The root `conduikt.com`
// domain is reserved for transactional / contact mailboxes (hello@,
// support@) and isn't used as a Resend sender.
//
// Each user can override with their own verified domain (Pro+ feature,
// gated behind a waitlist until Resend is upgraded). That override path
// lives in the broadcast send route, not here.
export const CONDUIKT_MARKETING_FROM = "Conduikt <mail@contacts.conduikt.com>";
export const CONDUIKT_MARKETING_DOMAIN = "contacts.conduikt.com";

// Free-tier and Pro-tier-without-custom-domain users send through Conduikt's
// shared sender. Their display name is set to the user's project/company
// name so recipients see "Acme Corp <mail@contacts.conduikt.com>". Reply-to
// is set to the user's own email. This sidesteps the cost of provisioning
// a per-user subdomain on Resend.
export const CONDUIKT_SHARED_FROM_EMAIL = "mail@contacts.conduikt.com";

// Resend rejects broadcasts that don't include an unsubscribe link, and
// CAN-SPAM/GDPR require one anyway. Resend templates support a magic
// {{{RESEND_UNSUBSCRIBE_URL}}} variable that is replaced per-recipient
// with their one-click unsubscribe link.
//
// ensureUnsubscribeFooter returns the html unchanged if it already
// references the variable; otherwise it appends a minimal styled footer.
const UNSUBSCRIBE_TOKEN_RE = /RESEND_UNSUBSCRIBE_URL/i;

export function ensureUnsubscribeFooter(html: string): string {
  if (UNSUBSCRIBE_TOKEN_RE.test(html)) return html;
  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e0db;color:#8a8176;font-size:12px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <p style="margin:0;">You're receiving this because you subscribed to our list. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#1F6B66;text-decoration:underline;">Unsubscribe</a>.</p>
</div>`;
  // If the html has a closing </body>, inject before it; otherwise append.
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}\n</body>`);
  }
  return html + footer;
}
