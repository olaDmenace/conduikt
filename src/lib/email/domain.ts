// Pure helpers for the custom sending domain flow. No I/O here so the
// rules are unit-testable; the API routes do the Resend + DB work.

import { CONDUIKT_MARKETING_DOMAIN } from "./marketing";

// A DNS label: 1-63 chars, letters/digits/hyphens, no leading or trailing
// hyphen. The whole name must have at least two labels and a letter-only
// top-level label.
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,63}$/;

// Domains nobody may claim as their own sender.
const RESERVED_SUFFIXES = ["conduikt.com", "resend.dev", "resend.com"];

export type DomainCheck = { ok: true; domain: string } | { ok: false; error: string };

/**
 * Turns whatever the user typed into a bare, lowercase domain name, or
 * says why it can't be used. Accepts "https://mail.example.com/" and
 * "Mail.Example.com" alike; rejects email addresses, IPs, localhost and
 * Conduikt's own domains.
 */
export function normalizeDomain(input: string): DomainCheck {
  let raw = (input ?? "").trim().toLowerCase();
  if (!raw) return { ok: false, error: "Type the domain you want to send from." };
  if (raw.includes("@")) {
    return { ok: false, error: "Type just the domain, not an email address (example.com, not hello@example.com)." };
  }
  raw = raw.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (raw.length > 253) return { ok: false, error: "That domain is too long." };

  const labels = raw.split(".");
  if (labels.length < 2) {
    return { ok: false, error: "That doesn't look like a domain. Try something like example.com or mail.example.com." };
  }
  for (const label of labels) {
    if (!LABEL_RE.test(label)) {
      return { ok: false, error: "That doesn't look like a domain. Use letters, numbers and hyphens only." };
    }
  }
  if (!TLD_RE.test(labels[labels.length - 1])) {
    return { ok: false, error: "That doesn't look like a domain. The last part should be letters, like .com." };
  }
  if (raw === "localhost" || labels.every((l) => /^\d+$/.test(l))) {
    return { ok: false, error: "That doesn't look like a public domain." };
  }
  for (const suffix of RESERVED_SUFFIXES) {
    if (raw === suffix || raw.endsWith(`.${suffix}`)) {
      return { ok: false, error: "That domain belongs to Conduikt's email service. Use your own domain." };
    }
  }
  if (raw === CONDUIKT_MARKETING_DOMAIN) {
    return { ok: false, error: "That domain belongs to Conduikt's email service. Use your own domain." };
  }
  return { ok: true, domain: raw };
}

const LOCAL_PART_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export type LocalPartCheck = { ok: true; localPart: string } | { ok: false; error: string };

/** The part before the @ in the sender address. Default is "hello". */
export function normalizeLocalPart(input: string | null | undefined): LocalPartCheck {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return { ok: true, localPart: "hello" };
  if (!LOCAL_PART_RE.test(raw)) {
    return { ok: false, error: "Use letters, numbers, dots, dashes or underscores, up to 64 characters." };
  }
  return { ok: true, localPart: raw };
}

export interface DnsRecordView {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string | number;
  priority?: number;
  status: "pending" | "verified" | "failed" | "not_started";
}

/** Normalises Resend's per-record status words into the four we show. */
export function normalizeRecordStatus(status: string | undefined | null): DnsRecordView["status"] {
  const s = (status ?? "").toLowerCase();
  if (s === "verified") return "verified";
  if (s === "failed" || s === "temporary_failure") return "failed";
  if (s === "not_started") return "not_started";
  return "pending";
}

export type DomainStatus = "pending" | "verified" | "failed";

/** Resend's domain status words collapsed to the three stored in verified_domains. */
export function normalizeDomainStatus(status: string | undefined | null): DomainStatus {
  const s = (status ?? "").toLowerCase();
  if (s === "verified") return "verified";
  if (s === "failed" || s === "temporary_failure") return "failed";
  return "pending";
}
