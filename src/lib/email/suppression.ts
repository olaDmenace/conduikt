// Suppression list parsing. Owners paste a block of addresses (one per
// line, or comma / semicolon / space separated); we keep the valid,
// unique, lowercased ones and report the rest.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedSuppressionList {
  emails: string[];
  invalid: string[];
  /** Number of duplicate entries dropped. */
  duplicates: number;
}

export const SUPPRESSION_LIST_MAX = 10_000;

export function parseSuppressionList(text: string): ParsedSuppressionList {
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  const tokens = (text ?? "")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // Allow "Name <addr@x.com>" and quoted addresses pasted from a mail client.
    const match = token.match(/<([^>]+)>/);
    const candidate = (match ? match[1] : token).replace(/^["']|["']$/g, "").toLowerCase();
    if (!EMAIL_RE.test(candidate)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(candidate)) {
      duplicates += 1;
      continue;
    }
    seen.add(candidate);
    emails.push(candidate);
    if (emails.length >= SUPPRESSION_LIST_MAX) break;
  }

  return { emails, invalid, duplicates };
}

/** Statuses that mean "never send to this address again" without the owner's say-so. */
export const HARD_SUPPRESSED = new Set(["bounced", "complained"]);

/** Statuses an owner may flip back to subscribed from the dashboard. */
export function canUnsuppress(status: string): boolean {
  return status === "suppressed" || status === "unsubscribed";
}
