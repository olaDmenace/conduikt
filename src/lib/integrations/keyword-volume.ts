// Monthly search volume for Missing Pages ("searches a month").
//
// DataForSEO when DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are set; otherwise
// NoVolumeProvider returns nulls and the scorer falls back to a seed-based
// estimate (flagged `estimated` so the UI says "estimate", not a number).
// Credentials never reach a log line.

import { safeFetch } from "@/src/lib/security/safe-fetch";

export type Competition = "low" | "medium" | "high";

export interface KeywordVolume {
  query: string;
  monthlySearches: number | null;
  competition: Competition | null;
}

export interface LookupOptions {
  /** e.g. "Nigeria", "United States" (DataForSEO location_name). */
  locationName?: string;
  /** e.g. "en" */
  languageCode?: string;
}

export interface KeywordVolumeProvider {
  readonly name: string;
  lookup(queries: string[], opts?: LookupOptions): Promise<KeywordVolume[]>;
}

export class NoVolumeProvider implements KeywordVolumeProvider {
  readonly name = "none";
  async lookup(queries: string[]): Promise<KeywordVolume[]> {
    return queries.map((query) => ({ query, monthlySearches: null, competition: null }));
  }
}

const DATAFORSEO_URL = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live";
const BATCH = 100;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface DataForSeoItem {
  keyword?: string;
  search_volume?: number | null;
  competition?: string | null;
  competition_index?: number | null;
}

function mapCompetition(raw: string | null | undefined, index: number | null | undefined): Competition | null {
  const r = (raw ?? "").toUpperCase();
  if (r === "LOW" || r === "MEDIUM" || r === "HIGH") return r.toLowerCase() as Competition;
  if (typeof index === "number") {
    if (index < 34) return "low";
    if (index < 67) return "medium";
    return "high";
  }
  return null;
}

export class DataForSeoProvider implements KeywordVolumeProvider {
  readonly name = "dataforseo";
  private readonly auth: string;
  private readonly fetchImpl: FetchLike;

  constructor(login: string, password: string, fetchImpl?: FetchLike) {
    this.auth = Buffer.from(`${login}:${password}`).toString("base64");
    this.fetchImpl = fetchImpl ?? ((u, init) => safeFetch(u, init));
  }

  async lookup(queries: string[], opts: LookupOptions = {}): Promise<KeywordVolume[]> {
    const unique = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
    const byQuery = new Map<string, KeywordVolume>();
    for (const q of unique) byQuery.set(q.toLowerCase(), { query: q, monthlySearches: null, competition: null });

    for (let i = 0; i < unique.length; i += BATCH) {
      const keywords = unique.slice(i, i + BATCH);
      const task: Record<string, unknown> = { keywords };
      if (opts.locationName) task.location_name = opts.locationName;
      if (opts.languageCode) task.language_code = opts.languageCode;

      let res: Response;
      try {
        res = await this.fetchImpl(DATAFORSEO_URL, {
          method: "POST",
          headers: { Authorization: `Basic ${this.auth}`, "Content-Type": "application/json" },
          body: JSON.stringify([task]),
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        console.warn("[keyword-volume] DataForSEO request failed; using estimates for this batch");
        continue;
      }
      if (!res.ok) {
        console.warn(`[keyword-volume] DataForSEO responded ${res.status}; using estimates for this batch`);
        continue;
      }
      const json = (await res.json().catch(() => null)) as
        | { tasks?: Array<{ status_code?: number; result?: DataForSeoItem[] | null }> }
        | null;
      for (const t of json?.tasks ?? []) {
        for (const item of t.result ?? []) {
          if (!item.keyword) continue;
          const key = item.keyword.toLowerCase();
          const existing = byQuery.get(key);
          if (!existing) continue;
          existing.monthlySearches = typeof item.search_volume === "number" ? item.search_volume : null;
          existing.competition = mapCompetition(item.competition, item.competition_index);
        }
      }
    }

    return queries.map((q) => byQuery.get(q.trim().toLowerCase()) ?? { query: q, monthlySearches: null, competition: null });
  }
}

/** DataForSEO when configured, else the null provider. */
export function getKeywordVolumeProvider(env: NodeJS.ProcessEnv = process.env): KeywordVolumeProvider {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  if (login && password) return new DataForSeoProvider(login, password);
  return new NoVolumeProvider();
}
