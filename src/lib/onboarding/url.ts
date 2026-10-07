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
