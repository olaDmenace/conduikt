import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatFrom } from "@/src/lib/email/sender";
import {
  getWhatsAppConnection,
  normalisePhone,
  sendTextMessage,
  type SendResult,
  type WhatsAppConnection,
} from "@/src/lib/integrations/whatsapp";

// Review requests (audit 2026-10-24 §5.4 item 6).
//
// Every customer gets the same ask, worded the same way, the moment the
// job is done. Google's review policy forbids "review gating" (asking only
// the happy ones), so nothing here looks at sentiment; the only branch is
// which channel can reach the person.
//
// Email goes out from the shared transactional mailbox (the one welcome
// emails use) with the business name as the display name. WhatsApp is
// used when the contact has opted in and the project has a WhatsApp
// connection. Each attempt is one review_requests row.
//
// A paste of up to CSV_MAX_ROWS customers is one call: every row is
// written as "queued" first (so the list shows progress even if the
// request dies), emails go out through Resend's batch endpoint in
// chunks, WhatsApp messages one at a time with a small gap, and the rows
// are then updated in groups. The route that calls this sets
// maxDuration = 300.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export type ReviewChannel = "email" | "whatsapp";
export type ReviewRequestStatus = "queued" | "sent" | "failed" | "skipped";

/** Same mailbox as src/lib/email/index.ts; the display name becomes the business. */
export const REVIEW_FROM_EMAIL = "hello@contacts.conduikt.com";

export const REVIEW_LINK_MISSING_MESSAGE = "Add your Google review link in Settings first";
export const REVIEW_LINK_NOT_GOOGLE_MESSAGE =
  "Your review link must be a Google review link (it starts with g.page/r/)";

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface ReviewMessageInput {
  businessName: string;
  reviewUrl: string;
  customerName?: string | null;
}

function cleanName(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function firstName(s: string | null | undefined): string {
  return cleanName(s).split(" ")[0] ?? "";
}

/** The one sentence every channel sends. */
export function reviewRequestText(input: ReviewMessageInput): string {
  const business = cleanName(input.businessName) || "us";
  return `Thanks for choosing ${business}. If you have a minute, a Google review helps others find us: ${input.reviewUrl}`;
}

/** WhatsApp variant: a greeting line, the same ask, and a way out. */
export function buildReviewWhatsApp(input: ReviewMessageInput): string {
  const name = firstName(input.customerName);
  const greeting = name ? `Hi ${name}, ` : "";
  const body = reviewRequestText(input);
  return `${greeting}${body.charAt(0).toLowerCase()}${body.slice(1)}\n\nReply STOP to opt out.`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface ReviewEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildReviewEmail(input: ReviewMessageInput): ReviewEmail {
  const business = cleanName(input.businessName) || "us";
  const name = firstName(input.customerName);
  const greeting = name ? `Hi ${name},` : "Hello,";
  const ask = reviewRequestText(input);
  const url = escapeHtml(input.reviewUrl);
  return {
    subject: `How did we do? A quick review helps ${business}`,
    text: `${greeting}\n\n${ask}\n\nThank you,\n${business}`,
    html:
      `<p>${escapeHtml(greeting)}</p>` +
      `<p>Thanks for choosing ${escapeHtml(business)}. If you have a minute, a Google review helps others find us: ` +
      `<a href="${url}">${url}</a></p>` +
      `<p>Thank you,<br>${escapeHtml(business)}</p>`,
  };
}

// ---------------------------------------------------------------------------
// Channel choice
// ---------------------------------------------------------------------------

export interface ChannelChoiceInput {
  /** What the owner asked for; null means "whatever reaches them". */
  requested?: ReviewChannel | null;
  email: string | null | undefined;
  phone: string | null | undefined;
  whatsappOptIn: boolean;
  whatsappConnected: boolean;
}

export type ChannelChoice = { channel: ReviewChannel } | { channel: null; reason: string };

/**
 * Pick the channel that can actually reach the customer. WhatsApp needs a
 * phone number, the contact's opt-in and a connection on the project;
 * email needs an address. A requested channel that cannot be used falls
 * back to the other one; with neither usable the request is skipped with
 * a plain reason.
 */
export function chooseChannel(input: ChannelChoiceInput): ChannelChoice {
  const canWhatsApp = !!normalisePhone(input.phone) && input.whatsappOptIn && input.whatsappConnected;
  const canEmail = isEmail(input.email);

  const order: ReviewChannel[] =
    input.requested === "email" ? ["email", "whatsapp"] : ["whatsapp", "email"];
  for (const channel of order) {
    if (channel === "whatsapp" && canWhatsApp) return { channel };
    if (channel === "email" && canEmail) return { channel };
  }

  if (input.phone && !input.email) {
    if (!input.whatsappConnected) return { channel: null, reason: "WhatsApp is not connected for this project" };
    if (!input.whatsappOptIn) return { channel: null, reason: "This customer has not agreed to WhatsApp messages" };
    return { channel: null, reason: "That phone number does not look valid" };
  }
  if (input.email && !canEmail) return { channel: null, reason: "That email address does not look valid" };
  return { channel: null, reason: "Add an email address or a phone number" };
}

export function isEmail(s: string | null | undefined): s is string {
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// ---------------------------------------------------------------------------
// CSV paste
// ---------------------------------------------------------------------------

export interface ReviewCsvRow {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface ReviewCsvResult {
  rows: ReviewCsvRow[];
  /** 1-based line numbers that had no name, or no email and no phone. */
  skippedLines: number[];
}

/** Cap on customers one paste may queue; the route answers 400 above it. */
export const CSV_MAX_ROWS = 50;

/**
 * "name,email,phone" per line; a header line is ignored, columns may be
 * separated by commas, semicolons or tabs, and either of email/phone may
 * be blank. Lines with no name or no way to reach the person are reported
 * as skipped rather than silently dropped.
 */
export function parseReviewCsv(raw: string): ReviewCsvResult {
  const rows: ReviewCsvRow[] = [];
  const skippedLines: number[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const [name = "", a = "", b = ""] = cols;
    const lower = name.toLowerCase();
    if (i === 0 && (lower === "name" || lower === "customer" || lower === "full name")) continue;

    // Accept email and phone in either order.
    let email: string | null = null;
    let phone: string | null = null;
    for (const v of [a, b]) {
      if (!v) continue;
      if (isEmail(v)) email = email ?? v.toLowerCase();
      else if (normalisePhone(v)) phone = phone ?? v;
    }

    if (!name || (!email && !phone)) {
      skippedLines.push(i + 1);
      continue;
    }
    rows.push({ name, email, phone });
  }
  // Every usable row is returned so the caller can see a paste is over
  // CSV_MAX_ROWS and say so, instead of silently sending the first N.
  return { rows, skippedLines };
}

// ---------------------------------------------------------------------------
// The review link
// ---------------------------------------------------------------------------

export interface ReviewProject {
  id: string;
  name: string | null;
  review_url?: unknown;
}

/** The review link, or null when it is missing or not a web address. */
export function reviewUrlOf(project: Pick<ReviewProject, "review_url">): string | null {
  const raw = typeof project.review_url === "string" ? project.review_url.trim() : "";
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// Every request is sent from Conduikt's own mailbox to an address the
// owner typed, with the project's name as the sender. Pinning the link to
// Google's own hosts is what stops a throwaway account using that mailbox
// to send people somewhere else.
const GOOGLE_SHORT_HOSTS = new Set(["g.page", "g.co", "goo.gl", "maps.app.goo.gl"]);
const GOOGLE_HOST = /^(?:[a-z0-9-]+\.)?google(?:\.[a-z]{2,3}){1,2}$/i;

/** True for the links Google hands out for reviews, maps and profiles. */
export function isGoogleReviewLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return GOOGLE_SHORT_HOSTS.has(host) || GOOGLE_HOST.test(host);
  } catch {
    return false;
  }
}

/** Why requests cannot go out yet, in the owner's words; null when the link is fine. */
export function reviewLinkProblem(project: Pick<ReviewProject, "review_url">): string | null {
  const url = reviewUrlOf(project);
  if (!url) return REVIEW_LINK_MISSING_MESSAGE;
  if (!isGoogleReviewLink(url)) return REVIEW_LINK_NOT_GOOGLE_MESSAGE;
  return null;
}

/** The link requests may point to: a Google one, or null. */
export function usableReviewUrl(project: Pick<ReviewProject, "review_url">): string | null {
  const url = reviewUrlOf(project);
  return url && isGoogleReviewLink(url) ? url : null;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/** One customer to ask. */
export interface ReviewCustomer {
  name: string;
  email?: string | null;
  phone?: string | null;
  contactId?: string | null;
  requested?: ReviewChannel | null;
}

export interface SendReviewRequestInput extends ReviewCustomer {
  project: ReviewProject;
}

export interface ReviewRequestRow {
  id: string;
  project_id: string;
  contact_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  channel: ReviewChannel;
  status: ReviewRequestStatus;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendOutcome = { ok: true } | { ok: false; error: string };

/** Everything that talks to the outside world, swappable in tests. */
export interface SendDeps {
  /** Send several emails in one provider call; one outcome per message, in order. */
  sendEmails: (messages: OutgoingEmail[]) => Promise<SendOutcome[]>;
  sendWhatsApp: (conn: WhatsAppConnection, to: string, body: string) => Promise<SendResult>;
  getConnection: (db: Db, projectId: string) => Promise<WhatsAppConnection | null>;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
}

/** Resend's batch endpoint takes up to 100 emails per call. */
export const EMAIL_BATCH_SIZE = 100;
/** Resend allows 2 API requests a second by default; this keeps well under it. */
export const EMAIL_BATCH_GAP_MS = 600;
/** A breath between WhatsApp messages so a paste of them does not hit the API at once. */
export const WHATSAPP_GAP_MS = 250;

async function resendSendMany(messages: OutgoingEmail[]): Promise<SendOutcome[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return messages.map(() => ({ ok: false, error: "Email sending is not set up (RESEND_API_KEY)" }));
  try {
    const { Resend } = await import("resend");
    const res = await new Resend(key).batch.send(
      messages.map((m) => ({ from: m.from, to: [m.to], subject: m.subject, text: m.text, html: m.html })),
      // Permissive: one bad address fails that one email, not the chunk,
      // and the response says which indexes failed.
      { batchValidation: "permissive" }
    );
    if (res.error) {
      const msg = res.error.message ?? "Email send failed";
      return messages.map(() => ({ ok: false, error: msg }));
    }
    const failed = new Map<number, string>();
    const errors = (res.data as { errors?: { index: number; message: string }[] } | null)?.errors ?? [];
    for (const e of errors) failed.set(e.index, e.message || "Email send failed");
    return messages.map((_, i) => {
      const err = failed.get(i);
      return err ? { ok: false, error: err } : { ok: true };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email send failed";
    return messages.map(() => ({ ok: false, error: msg }));
  }
}

const defaultDeps: SendDeps = {
  sendEmails: resendSendMany,
  sendWhatsApp: (conn, to, body) => sendTextMessage(conn, { to, body }),
  getConnection: getWhatsAppConnection,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

interface ContactFacts {
  id: string | null;
  email: string | null;
  phone: string | null;
  whatsappOptIn: boolean;
}

const NO_CONTACT: ContactFacts = { id: null, email: null, phone: null, whatsappOptIn: false };

function factsOf(row: Record<string, unknown>): ContactFacts {
  return {
    id: (row.id as string) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    whatsappOptIn: row.whatsapp_opt_in === true,
  };
}

/**
 * What we know about these customers from audience_contacts: by id when
 * given, otherwise by phone within the project's audiences. Two queries
 * for the whole batch. Opt-in only ever comes from a stored contact; a
 * typed phone number alone is not consent.
 */
async function lookupContacts(db: Db, projectId: string, customers: ReviewCustomer[]): Promise<ContactFacts[]> {
  const select = "id, email, phone, whatsapp_opt_in, audiences!inner(project_id)";
  const ids = Array.from(new Set(customers.map((c) => c.contactId).filter((x): x is string => !!x)));
  const phones = Array.from(
    new Set(
      customers
        .filter((c) => !c.contactId)
        .map((c) => normalisePhone(c.phone))
        .filter((x): x is string => !!x)
    )
  );

  const byId = new Map<string, ContactFacts>();
  const byPhone = new Map<string, ContactFacts>();
  if (ids.length > 0) {
    const { data } = await db.from("audience_contacts").select(select).eq("audiences.project_id", projectId).in("id", ids);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const f = factsOf(row);
      if (f.id) byId.set(f.id, f);
    }
  }
  if (phones.length > 0) {
    const { data } = await db.from("audience_contacts").select(select).eq("audiences.project_id", projectId).in("phone", phones);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const f = factsOf(row);
      if (f.phone && !byPhone.has(f.phone)) byPhone.set(f.phone, f);
    }
  }

  return customers.map((c) => {
    if (c.contactId) return byId.get(c.contactId) ?? NO_CONTACT;
    const phone = normalisePhone(c.phone);
    return (phone && byPhone.get(phone)) || NO_CONTACT;
  });
}

interface PlannedRow {
  row: ReviewRequestRow;
  /** Where the message goes, when the row is queued. */
  channel: ReviewChannel | null;
  phone: string | null;
}

/**
 * Ask these customers for a review and record every attempt, one row
 * each, returned in the order given. A failed send never throws: the
 * row says what happened. Throws only when the rows cannot be written.
 */
export async function sendReviewRequests(
  db: Db,
  project: ReviewProject,
  customers: ReviewCustomer[],
  deps: Partial<SendDeps> = {}
): Promise<ReviewRequestRow[]> {
  if (customers.length === 0) return [];
  const d: SendDeps = { ...defaultDeps, ...deps };
  const projectId = project.id;
  const businessName = cleanName(project.name) || "us";
  const reviewUrl = usableReviewUrl(project);
  const linkProblem = reviewLinkProblem(project);

  const contacts = await lookupContacts(db, projectId, customers);
  const resolved = customers.map((c, i) => {
    const contact = contacts[i];
    const email = (c.email?.trim() || contact.email || null)?.toLowerCase() ?? null;
    const phoneRaw = c.phone?.trim() || contact.phone || null;
    const phone = normalisePhone(phoneRaw) ?? phoneRaw;
    return { c, contact, email, phone };
  });

  // One connection lookup for the whole batch, and only when a phone is in play.
  const conn = resolved.some((r) => r.phone) ? await d.getConnection(db, projectId) : null;
  const createdAt = d.now().toISOString();

  const planned: PlannedRow[] = resolved.map(({ c, contact, email, phone }) => {
    const choice = chooseChannel({
      requested: c.requested ?? null,
      email,
      phone,
      whatsappOptIn: contact.whatsappOptIn,
      whatsappConnected: !!conn,
    });
    const base: ReviewRequestRow = {
      id: randomUUID(),
      project_id: projectId,
      contact_id: contact.id,
      name: cleanName(c.name) || "Customer",
      email,
      phone,
      channel: choice.channel ?? (c.requested ?? (email ? "email" : "whatsapp")),
      status: "queued",
      sent_at: null,
      error: null,
      created_at: createdAt,
    };
    if (linkProblem || !reviewUrl) return { row: { ...base, status: "skipped", error: linkProblem }, channel: null, phone };
    if (!choice.channel) return { row: { ...base, status: "skipped", error: choice.reason }, channel: null, phone };
    return { row: base, channel: choice.channel, phone };
  });

  // The rows go in first, all at once, so a crash mid-send still leaves a
  // trace and the list shows them as queued while the sends run.
  const stored = await insertRows(db, planned.map((p) => p.row));
  for (const p of planned) {
    const s = stored.get(p.row.id);
    if (s) p.row = s;
  }

  const outcomes = new Map<string, SendOutcome>();

  // Email: Resend's batch endpoint, in chunks, with a gap between calls.
  const emailJobs = planned.filter((p) => p.channel === "email");
  for (let i = 0; i < emailJobs.length; i += EMAIL_BATCH_SIZE) {
    if (i > 0) await d.sleep(EMAIL_BATCH_GAP_MS);
    const chunk = emailJobs.slice(i, i + EMAIL_BATCH_SIZE);
    const messages = chunk.map((p) => ({
      from: formatFrom(businessName, REVIEW_FROM_EMAIL),
      to: p.row.email as string,
      ...buildReviewEmail({ businessName, reviewUrl: reviewUrl as string, customerName: p.row.name }),
    }));
    let results: SendOutcome[];
    try {
      results = await d.sendEmails(messages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email send failed";
      results = messages.map(() => ({ ok: false, error: msg }));
    }
    chunk.forEach((p, j) => outcomes.set(p.row.id, results[j] ?? { ok: false, error: "No result from the email provider" }));
  }

  // WhatsApp: one message at a time, with a breath between them.
  const waJobs = planned.filter((p) => p.channel === "whatsapp");
  for (let i = 0; i < waJobs.length; i++) {
    if (i > 0) await d.sleep(WHATSAPP_GAP_MS);
    const p = waJobs[i];
    const body = buildReviewWhatsApp({ businessName, reviewUrl: reviewUrl as string, customerName: p.row.name });
    try {
      const r = await d.sendWhatsApp(conn as WhatsAppConnection, p.phone as string, body);
      outcomes.set(p.row.id, r.ok ? { ok: true } : { ok: false, error: r.error });
    } catch (err) {
      outcomes.set(p.row.id, { ok: false, error: err instanceof Error ? err.message : "WhatsApp send failed" });
    }
  }

  // Record what happened, in groups: one update for everything sent, one
  // per distinct failure message.
  const sentAt = d.now().toISOString();
  const sentIds: string[] = [];
  const failedByError = new Map<string, string[]>();
  for (const p of planned) {
    const o = outcomes.get(p.row.id);
    if (!o) continue;
    if (o.ok) {
      p.row = { ...p.row, status: "sent", sent_at: sentAt, error: null };
      sentIds.push(p.row.id);
    } else {
      const error = o.error.slice(0, 500);
      p.row = { ...p.row, status: "failed", error };
      failedByError.set(error, [...(failedByError.get(error) ?? []), p.row.id]);
    }
  }
  if (sentIds.length > 0) {
    await updateRows(db, sentIds, { status: "sent", sent_at: sentAt, error: null });
  }
  for (const [error, ids] of failedByError) {
    await updateRows(db, ids, { status: "failed", error });
  }

  return planned.map((p) => p.row);
}

/**
 * Ask one customer for a review and record the attempt. Never throws for
 * a failed send: the row says what happened. Throws only when the row
 * itself cannot be written.
 */
export async function sendReviewRequest(
  db: Db,
  input: SendReviewRequestInput,
  deps: Partial<SendDeps> = {}
): Promise<ReviewRequestRow> {
  const { project, ...customer } = input;
  const [row] = await sendReviewRequests(db, project, [customer], deps);
  return row;
}

async function insertRows(db: Db, rows: ReviewRequestRow[]): Promise<Map<string, ReviewRequestRow>> {
  const { data, error } = await db.from("review_requests").insert(rows).select("*");
  if (error) throw new Error(error.message ?? "Could not record the review requests");
  const stored = new Map<string, ReviewRequestRow>();
  for (const r of (data ?? []) as ReviewRequestRow[]) stored.set(r.id, r);
  return stored;
}

async function updateRows(db: Db, ids: string[], patch: Partial<ReviewRequestRow>): Promise<void> {
  const { error } = await db.from("review_requests").update(patch).in("id", ids);
  if (error) console.error("[review-requests] could not update rows:", error.message);
}

/** The most recent requests for a project, newest first. */
export async function listReviewRequests(db: Db, projectId: string, limit = 200): Promise<ReviewRequestRow[]> {
  const { data, error } = await db
    .from("review_requests")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewRequestRow[];
}
