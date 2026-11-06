// The "Strategy agent" from the reel, as arithmetic: searches a month x
// how crowded the search is x whether the searcher wants to book x
// whether a page already exists. Pure; no I/O.

import type { KeywordVolume } from "@/src/lib/integrations/keyword-volume";
import type { CandidateKind, GapMatch, ScoredCandidate } from "./types";

const BOOKING_INTENT = /\b(near me|emergency|prices?|pricing|cost|costs|same[- ]day|quote|estimate|book|booking|hire|call|24\/7)\b/i;
const INFORMATIONAL = /^(how to|how do|what is|what are|why|guide|tips)\b/i;

const COMPETITION_TERM: Record<string, number> = { low: 1.0, medium: 0.7, high: 0.4 };

/** A seed-based guess for searches a month when no provider answered. */
export function estimatedVolume(query: string): number {
  if (/\bnear me\b/i.test(query)) return 320;
  if (/\b(prices?|pricing|cost|costs)\b/i.test(query)) return 260;
  if (/\b(emergency|same[- ]day|24\/7)\b/i.test(query)) return 170;
  if (/\b(alternative|vs)\b/i.test(query)) return 140;
  if (/\b(best|reviews?)\b/i.test(query)) return 120;
  if (/^how to\b/i.test(query)) return 200;
  if (/\btemplate\b/i.test(query)) return 150;
  return 90;
}

export function intentWeight(query: string): number {
  if (BOOKING_INTENT.test(query)) return 1.3;
  if (INFORMATIONAL.test(query)) return 0.8;
  return 1.0;
}

export function gapTerm(strength: GapMatch["strength"]): number {
  if (strength === "none") return 1.0;
  if (strength === "weak") return 0.6;
  return 0;
}

export interface ScoreInput {
  query: string;
  monthlySearches: number | null;
  competition: KeywordVolume["competition"];
  strength: GapMatch["strength"];
}

export function scoreQuery(input: ScoreInput): { score: number; estimated: boolean; volumeUsed: number } {
  const estimated = input.monthlySearches === null;
  const volumeUsed = estimated ? estimatedVolume(input.query) : (input.monthlySearches as number);
  const volumeTerm = Math.log10(volumeUsed + 10);
  const competitionTerm = input.competition ? COMPETITION_TERM[input.competition] : 0.8;
  const score = volumeTerm * competitionTerm * intentWeight(input.query) * gapTerm(input.strength);
  return { score: Math.round(score * 1000) / 1000, estimated, volumeUsed };
}

/** Rank gaps by score. Strong matches are dropped; weak ones become 'update' candidates. */
export function rankCandidates(gaps: GapMatch[], volumes: KeywordVolume[]): ScoredCandidate[] {
  const byQuery = new Map(volumes.map((v) => [v.query.toLowerCase(), v]));
  const out: ScoredCandidate[] = [];
  for (const g of gaps) {
    if (g.strength === "strong") continue;
    const v = byQuery.get(g.query.toLowerCase());
    const monthlySearches = v?.monthlySearches ?? null;
    const competition = v?.competition ?? null;
    const { score, estimated } = scoreQuery({ query: g.query, monthlySearches, competition, strength: g.strength });
    const kind: CandidateKind = g.strength === "weak" ? "update" : "new";
    out.push({ query: g.query, kind, matchedUrl: g.matchedUrl, matchScore: g.matchScore, monthlySearches, competition, estimated, score });
  }
  return out.sort((a, b) => b.score - a.score || a.query.localeCompare(b.query));
}
