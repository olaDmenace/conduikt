// Looks up actual match outcomes via football-data.org so the X playbook's
// "yesterday's result" bracket posts (d4-a, d9-a) can fire honestly.
//
// Free tier: 10 req/min, 12 competitions (covers what PitchOdds tracks).
// Get a key at https://www.football-data.org/client/register — set as
// FOOTBALL_DATA_API_KEY in Vercel env vars.
//
// Docs: https://docs.football-data.org/general/v4/

const API_BASE = "https://api.football-data.org/v4";

export interface MatchResult {
  outcome: "home" | "draw" | "away" | "void";
  homeScore: number | null;
  awayScore: number | null;
  status: string; // e.g. "FINISHED", "POSTPONED", "CANCELED"
}

/**
 * Find yesterday's match result that best matches the given team names.
 * Returns null if no finished match matches or the API is unavailable.
 *
 * Team name match is fuzzy because football-data uses full names ("Bosnia
 * and Herzegovina") while PitchOdds abbreviates ("Bosnia-H."). We compare
 * normalized substrings — strip punctuation/spaces, lowercase, then check
 * one is a prefix of the other.
 */
export async function findYesterdaysResult(
  homeTeam: string,
  awayTeam: string,
  yesterdayIso: string // YYYY-MM-DD
): Promise<MatchResult | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("[football-data] FOOTBALL_DATA_API_KEY not set — skipping");
    return null;
  }

  const url = `${API_BASE}/matches?dateFrom=${yesterdayIso}&dateTo=${yesterdayIso}`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[football-data] matches fetch failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const json = (await res.json()) as {
    matches?: Array<{
      homeTeam: { name?: string; shortName?: string; tla?: string };
      awayTeam: { name?: string; shortName?: string; tla?: string };
      status: string;
      score: { fullTime: { home: number | null; away: number | null } };
    }>;
  };

  const matches = json.matches ?? [];
  if (matches.length === 0) return null;

  const homeKey = normalize(homeTeam);
  const awayKey = normalize(awayTeam);

  const fuzzy = matches.find((m) => {
    const fdHome = candidateNames(m.homeTeam).map(normalize);
    const fdAway = candidateNames(m.awayTeam).map(normalize);
    return (
      fdHome.some((n) => fuzzyMatch(n, homeKey)) &&
      fdAway.some((n) => fuzzyMatch(n, awayKey))
    );
  });

  if (!fuzzy) return null;
  if (fuzzy.status !== "FINISHED") {
    return { outcome: "void", homeScore: null, awayScore: null, status: fuzzy.status };
  }

  const home = fuzzy.score.fullTime.home;
  const away = fuzzy.score.fullTime.away;
  if (home == null || away == null) {
    return { outcome: "void", homeScore: home, awayScore: away, status: fuzzy.status };
  }

  let outcome: "home" | "draw" | "away";
  if (home > away) outcome = "home";
  else if (home < away) outcome = "away";
  else outcome = "draw";

  return { outcome, homeScore: home, awayScore: away, status: fuzzy.status };
}

function candidateNames(team: { name?: string; shortName?: string; tla?: string }): string[] {
  return [team.name, team.shortName, team.tla].filter((s): s is string => Boolean(s));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Either is a prefix of the other (handles "Bosnia-H." ≈ "Bosnia and Herzegovina"
  // once normalized to "bosnia h" vs "bosnia and herzegovina" — first 6 chars match)
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (longer.startsWith(shorter)) return true;
  // Or first significant word matches.
  const firstA = a.split(" ")[0];
  const firstB = b.split(" ")[0];
  if (firstA.length >= 4 && firstA === firstB) return true;
  return false;
}
