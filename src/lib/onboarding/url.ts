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
