// Pure, client-safe. Kept apart from magic-audit.ts so browser code can
// validate a URL without bundling the server-side Anthropic client.

/** Compact URL validator — accepts anything that parses as an http(s) URL. */
export function normalizeAuditUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Auto-prepend https:// if the user typed just a domain
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// "Check my site free" handoff (homepage band 9 → signup → Magic Audit).
// The address lives on this device only; it is never sent anywhere until
// the signed-in user's audit runs.
export const PENDING_AUDIT_KEY = "conduikt:pending-audit-url";

/** The waiting address, or null. Storage can throw in private mode. */
export function readPendingAudit(): string | null {
  try {
    return normalizeAuditUrl(localStorage.getItem(PENDING_AUDIT_KEY) ?? "");
  } catch {
    return null;
  }
}

export function clearPendingAudit(): void {
  try {
    localStorage.removeItem(PENDING_AUDIT_KEY);
  } catch {
    // Nothing to clear.
  }
}

// The signed-out check's result, kept on this device so the signed-in
// audit page can show it straight away instead of paying for it twice.
const PENDING_RESULT_KEY = "conduikt:pending-audit-result";
const PENDING_RESULT_MS = 60 * 60 * 1000;

export function savePendingResult(url: string, audit: unknown): void {
  try {
    localStorage.setItem(PENDING_RESULT_KEY, JSON.stringify({ url, audit, at: Date.now() }));
  } catch {
    // Storage blocked: the audit page will just run it again.
  }
}

/** The saved result for this URL if it's under an hour old. */
export function readPendingResult<T>(url: string): T | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_RESULT_KEY) ?? "null") as { url: string; audit: T; at: number } | null;
    if (!raw || raw.url !== url || Date.now() - raw.at > PENDING_RESULT_MS) return null;
    return raw.audit;
  } catch {
    return null;
  }
}

export function clearPendingResult(): void {
  try {
    localStorage.removeItem(PENDING_RESULT_KEY);
  } catch {
    // Nothing to clear.
  }
}
