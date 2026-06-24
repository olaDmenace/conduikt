// Scrapes pitch-odds.vercel.app's homepage for today's "standout" match —
// the one with the highest single-outcome probability (home / draw / away)
// among matches kicking off today (Africa/Lagos local date).
//
// No Playwright — the homepage is SSR'd Next.js and includes all match data,
// including the 1X2 probabilities encoded as CSS bar widths
// (`width:73.07%;background:var(--home)` etc).

export interface PitchOddsPick {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date | null;
  kickoffRaw: string | null;
  predictedProb: number; // 0–100, rounded
  predictedOutcome: "home" | "draw" | "away";
}

const PITCHODDS_URL = "https://pitch-odds.vercel.app/";

export async function scrapeTodaysStandoutPick(now: Date = new Date()): Promise<PitchOddsPick | null> {
  const res = await fetch(PITCHODDS_URL, {
    headers: { "User-Agent": "ConduiktBracketFiller/1.0 (contact: hello@conduikt.com)" },
  });
  if (!res.ok) {
    throw new Error(`PitchOdds fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const picks = parseAllMatches(html);

  const todayLagos = formatLagosDate(now);
  const todays = picks.filter((p) => sameDayLagos(p.kickoffRaw, todayLagos));
  if (todays.length === 0) return null;

  // Sort descending by predicted prob and take the top one.
  todays.sort((a, b) => b.predictedProb - a.predictedProb);
  return todays[0];
}

interface RawPick {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffRaw: string | null; // e.g. "Wed, Jun 24 07:00 PM" — for same-day comparison
  homeProb: number; // 0–100
  drawProb: number;
  awayProb: number;
  predictedProb: number;
  predictedOutcome: "home" | "draw" | "away";
}

/**
 * Parse every match card from the PitchOdds homepage HTML.
 * Exported so the cron route can introspect raw data via ?dry=1.
 */
export function parseAllMatches(html: string): PitchOddsPick[] {
  const cardRe = /<a[^>]+href="\/match\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  const out: PitchOddsPick[] = [];

  for (const [, matchId, inner] of html.matchAll(cardRe)) {
    const raw = parseCard(matchId, inner);
    if (raw) {
      out.push({
        matchId: raw.matchId,
        homeTeam: raw.homeTeam,
        awayTeam: raw.awayTeam,
        kickoffAt: parseKickoff(raw.kickoffRaw),
        kickoffRaw: raw.kickoffRaw,
        predictedProb: raw.predictedProb,
        predictedOutcome: raw.predictedOutcome,
      });
    }
  }
  return out;
}

function parseCard(matchId: string, inner: string): RawPick | null {
  // Date + time: <span>Wed, Jun 24</span><span>07:00 PM</span> at the top
  const dateTimeMatch = inner.match(
    /<span>([A-Z][a-z]+,\s*[A-Z][a-z]+\s+\d{1,2})<\/span>\s*<span>(\d{1,2}:\d{2}\s*[AP]M)<\/span>/i
  );
  const kickoffRaw = dateTimeMatch ? `${dateTimeMatch[1]} ${dateTimeMatch[2]}` : null;

  // Team names: inside the second div block, each team is `<img.../> <!-- -->TEAM`.
  // We pull every `--> NAME</span>` instance — the first is home, the second is away.
  // The `<!-- -->` is React's empty-text-fragment marker, present in SSR output.
  const teamMatches = [...inner.matchAll(/<!--\s*-->\s*([^<]+?)<\/span>/g)].map((m) =>
    m[1].trim()
  );
  if (teamMatches.length < 2) return null;
  const homeTeam = teamMatches[0];
  const awayTeam = teamMatches[1];

  // Bar widths encode the 1X2 probabilities precisely.
  const home = matchBarWidth(inner, "home");
  const draw = matchBarWidth(inner, "draw");
  const away = matchBarWidth(inner, "away");
  if (home == null || draw == null || away == null) return null;

  // Pick highest-confidence outcome.
  const ranked = (
    [
      { prob: home, outcome: "home" as const },
      { prob: draw, outcome: "draw" as const },
      { prob: away, outcome: "away" as const },
    ]
  ).sort((a, b) => b.prob - a.prob);

  return {
    matchId,
    homeTeam,
    awayTeam,
    kickoffRaw,
    homeProb: home,
    drawProb: draw,
    awayProb: away,
    predictedProb: ranked[0].prob,
    predictedOutcome: ranked[0].outcome,
  };
}

function matchBarWidth(html: string, outcome: "home" | "draw" | "away"): number | null {
  // <div style="width:73.07...%;background:var(--home);..."></div>
  const re = new RegExp(
    `width:\\s*([\\d.]+)%[^"]*background:\\s*var\\(--${outcome}\\)`,
    "i"
  );
  const m = html.match(re);
  if (!m) return null;
  return Math.round(parseFloat(m[1]));
}

function parseKickoff(raw: string | null): Date | null {
  if (!raw) return null;
  // "Wed, Jun 24 07:00 PM" — assume current year, in Africa/Lagos.
  // Use Date.parse which accepts "Jun 24 2026 07:00 PM" formats.
  const year = new Date().getFullYear();
  const cleaned = raw.replace(/^[A-Za-z]+,\s*/, ""); // drop "Wed, "
  const parsed = Date.parse(`${cleaned} ${year} GMT+0100`); // WAT is UTC+1
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function formatLagosDate(d: Date): string {
  // "Wed, Jun 24" format to match PitchOdds' display
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function sameDayLagos(kickoffRaw: string | null, todayLagosFormatted: string): boolean {
  if (!kickoffRaw) return false;
  // PitchOdds: "Wed, Jun 24 07:00 PM"; today: "Wed, Jun 24"
  return kickoffRaw.startsWith(todayLagosFormatted);
}
