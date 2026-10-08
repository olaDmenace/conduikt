import type { QuickAudit } from "./first-week-report";

// Validate a quick-audit payload (from the browser or the audits table)
// into the shape the report renders. Anything malformed becomes null.
export function toQuickAudit(raw: unknown): QuickAudit | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const score = typeof a.seoScore === "number" && Number.isFinite(a.seoScore) ? Math.max(0, Math.min(100, Math.round(a.seoScore))) : null;
  if (score === null) return null;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const bv = (a.brandVoice ?? {}) as Record<string, unknown>;
  return {
    seoScore: score,
    seoGrade: str(a.seoGrade, 2) || undefined,
    topIssues: (Array.isArray(a.topIssues) ? a.topIssues : []).filter((x): x is string => typeof x === "string").slice(0, 5).map((x) => x.slice(0, 400)),
    brandVoice: { tone: str(bv.tone, 200), audience: str(bv.audience, 400), valueProposition: str(bv.valueProposition, 400) },
    sampleLinkedInPosts: (Array.isArray(a.sampleLinkedInPosts) ? a.sampleLinkedInPosts : [])
      .filter((p): p is { angle: string; text: string } => !!p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string")
      .slice(0, 3)
      .map((p) => ({ angle: str(p.angle, 80), text: str(p.text, 3000) })),
  };
}

export const reportDate = (d = new Date()) => d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
export const safeFileHost = (host: string) => host.replace(/[^a-z0-9.-]/gi, "-").slice(0, 60);
