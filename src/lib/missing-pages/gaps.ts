// "You have a page?" For each search phrase, find the page on the site
// that already answers it. Lexical first (cheap, deterministic); Claude
// only for the ambiguous middle band, and only when asked.

import type { CrawledPage } from "@/src/lib/crawl/site-crawler";
import type { GapMatch } from "./types";

export const STRONG_MATCH = 0.75;
export const WEAK_MATCH = 0.4;

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "at", "by", "from", "is", "are",
  "near", "me", "my", "your", "our", "best", "top", "vs", "versus", "how", "what", "who", "do", "i", "you",
  "it", "this", "that", "get", "find", "free", "online", "services", "service", "company", "companies",
]);

/** Lowercase tokens with stemming-lite ("plumbers" -> "plumb", "cleaning" -> "clean"). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

export function stem(t: string): string {
  if (t.length <= 4) return t;
  for (const suffix of ["ing", "ers", "ies", "es", "ed", "er", "s"]) {
    if (t.endsWith(suffix) && t.length - suffix.length >= 3) {
      const base = t.slice(0, -suffix.length);
      return suffix === "ies" ? `${base}y` : base;
    }
  }
  return t;
}

function pathTokens(url: string): string[] {
  try {
    return tokenize(new URL(url).pathname.replace(/[-_/.]+/g, " "));
  } catch {
    return [];
  }
}

/** 0..1: how much of the query the page covers, weighted by where it appears. */
export function pageMatchScore(query: string, page: CrawledPage): number {
  const q = Array.from(new Set(tokenize(query)));
  if (q.length === 0) return 0;
  const strong = new Set([...tokenize(page.title ?? ""), ...tokenize(page.h1 ?? ""), ...pathTokens(page.url)]);
  const medium = new Set(page.headings.flatMap(tokenize));
  const weak = new Set(tokenize(page.textExcerpt.slice(0, 600)));
  let total = 0;
  for (const t of q) {
    if (strong.has(t)) total += 1;
    else if (medium.has(t)) total += 0.7;
    else if (weak.has(t)) total += 0.35;
  }
  return Math.min(1, total / q.length);
}

export function matchQuery(query: string, pages: CrawledPage[]): GapMatch {
  let best: { url: string; score: number } | null = null;
  for (const p of pages) {
    const s = pageMatchScore(query, p);
    if (!best || s > best.score) best = { url: p.url, score: s };
  }
  const score = best?.score ?? 0;
  const strength = score >= STRONG_MATCH ? "strong" : score >= WEAK_MATCH ? "weak" : "none";
  return {
    query,
    matchedUrl: strength === "none" ? null : best!.url,
    matchScore: Math.round(score * 1000) / 1000,
    strength,
  };
}

export interface FindGapsOptions {
  /** Ask Claude about the weak band. Off by default; costs one call per run. */
  useClaude?: boolean;
  /** Test seam for the Claude call. */
  disambiguate?: (items: Array<{ query: string; page: CrawledPage }>) => Promise<Record<string, boolean>>;
}

/** One GapMatch per query. Weak matches may be promoted or demoted by Claude. */
export async function findGaps(queries: string[], pages: CrawledPage[], opts: FindGapsOptions = {}): Promise<GapMatch[]> {
  const matches = queries.map((q) => matchQuery(q, pages));
  if (!opts.useClaude) return matches;

  const weak = matches.filter((m) => m.strength === "weak" && m.matchedUrl);
  if (weak.length === 0) return matches;
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const items = weak.map((m) => ({ query: m.query, page: byUrl.get(m.matchedUrl!)! })).filter((i) => i.page);
  const verdicts = await (opts.disambiguate ?? claudeDisambiguate)(items).catch(() => ({}) as Record<string, boolean>);

  return matches.map((m) => {
    if (m.strength !== "weak" || !(m.query in verdicts)) return m;
    return verdicts[m.query] ? { ...m, strength: "strong", matchScore: Math.max(m.matchScore, STRONG_MATCH) } : { ...m, strength: "none", matchedUrl: null };
  });
}

async function claudeDisambiguate(items: Array<{ query: string; page: CrawledPage }>): Promise<Record<string, boolean>> {
  const { generateWithClaude } = await import("@/src/lib/ai/client");
  const { parseJsonResponse } = await import("@/src/lib/ai/parse-json");
  const list = items
    .map(
      (i, n) =>
        `${n + 1}. Search: "${i.query}"\n   Page: ${i.page.url}\n   Title: ${i.page.title ?? ""}\n   H1: ${i.page.h1 ?? ""}\n   Headings: ${i.page.headings.slice(0, 8).join(" | ")}\n   Text: ${i.page.textExcerpt.slice(0, 400)}`
    )
    .join("\n\n");
  const result = await generateWithClaude({
    systemPrompt:
      'For each numbered pair, decide whether the page already answers the search well enough that a searcher would be satisfied. Return ONLY JSON: {"verdicts": [{"n": 1, "answers": true}, ...]}',
    userPrompt: list,
    maxTokens: 800,
    temperature: 0,
  });
  const parsed = parseJsonResponse(result.content) as { verdicts?: Array<{ n: number; answers: boolean }> };
  const out: Record<string, boolean> = {};
  for (const v of parsed.verdicts ?? []) {
    const item = items[v.n - 1];
    if (item) out[item.query] = !!v.answers;
  }
  return out;
}
