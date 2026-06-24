// Scrapes pitch-odds.vercel.app for today's "standout" match — the one with
// the highest single-outcome probability among matches kicking off today
// (Africa/Lagos local date).
//
// Uses playwright-core + @sparticuz/chromium so it runs on Vercel Fluid Compute.
// Locally, falls back to the system chromium if available.

import chromium from "@sparticuz/chromium";
import { chromium as playwright, type Browser } from "playwright-core";

export interface PitchOddsPick {
  matchId: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date | null;
  predictedProb: number; // 0–100
  predictedOutcome: "home" | "draw" | "away";
}

const PITCHODDS_URL = "https://pitch-odds.vercel.app/";

async function launchBrowser(): Promise<Browser> {
  // On Vercel, @sparticuz/chromium ships the binary. Locally, fall back to
  // whatever Playwright finds (developer must have run `npx playwright install chromium`).
  const executablePath = await chromium.executablePath().catch(() => undefined);
  return playwright.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}

/**
 * Scrape today's matches. Returns the highest-confidence pick or null if no
 * matches kick off today.
 *
 * @param now    The reference instant (defaults to actual now). Tests inject a fixed date.
 */
export async function scrapeTodaysStandoutPick(now: Date = new Date()): Promise<PitchOddsPick | null> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ userAgent: "ConduiktBracketFiller/1.0" });
    await page.goto(PITCHODDS_URL, { waitUntil: "networkidle", timeout: 30_000 });

    // The site is a Next.js app; wait for hydration so match cards are interactive.
    await page.waitForSelector('a[href^="/match/"]', { timeout: 15_000 });

    type RawMatch = {
      matchId: string | null;
      homeTeam: string;
      awayTeam: string;
      kickoffIso: string | null;
      homeProb: number | null;
      drawProb: number | null;
      awayProb: number | null;
    };

    // Extract every match card the page has hydrated. We do the date filter
    // and "highest probability" pick in TS so the logic is testable.
    const matches: RawMatch[] = await page.$$eval(
      'a[href^="/match/"]',
      (anchors) =>
        anchors.map((a) => {
          const href = a.getAttribute("href") ?? "";
          const matchId = href.split("/match/")[1]?.split(/[/?#]/)[0] ?? null;
          const text = (a.textContent ?? "").replace(/\s+/g, " ").trim();
          // <time> tags / data-iso attributes are the most reliable signal.
          // Fall back to scanning the visible text for a date string.
          const timeEl = a.querySelector("time");
          const kickoffIso =
            timeEl?.getAttribute("datetime") ??
            a.getAttribute("data-kickoff") ??
            null;

          // Team names: assume the two `img + text` pairs hold home then away.
          // Greedy parse — split the text on " vs " if present.
          const vsMatch = text.match(/^(.+?)\s+vs\.?\s+(.+?)\s+/i);
          const homeTeam = vsMatch?.[1] ?? "";
          const awayTeam = vsMatch?.[2] ?? "";

          // Win probability bars usually appear as "55%" / "60%" tokens.
          // The first one tends to be home, then away, then markets (O2.5 / BTTS).
          const pctTokens = [...text.matchAll(/(\d{1,3})\s*%/g)].map((m) =>
            parseInt(m[1], 10)
          );
          const homeProb = pctTokens[0] ?? null;
          const drawProb = pctTokens[1] ?? null;
          const awayProb = pctTokens[2] ?? null;

          return { matchId, homeTeam, awayTeam, kickoffIso, homeProb, drawProb, awayProb };
        })
    );

    await browser.close();

    // Filter to today (Africa/Lagos local date) — anything without a parseable
    // kickoff is dropped rather than risk picking tomorrow's match.
    const todayLagos = todayInLagos(now);
    const todaysMatches = matches.filter((m) => {
      if (!m.kickoffIso) return false;
      const d = new Date(m.kickoffIso);
      if (Number.isNaN(d.getTime())) return false;
      return dateInLagos(d) === todayLagos;
    });

    if (todaysMatches.length === 0) {
      return null;
    }

    // Pick the match whose single-best outcome has the highest probability —
    // that's the playbook's "standout call."
    let best: { match: RawMatch; prob: number; outcome: "home" | "draw" | "away" } | null = null;
    for (const m of todaysMatches) {
      const candidates: { prob: number; outcome: "home" | "draw" | "away" }[] = [];
      if (typeof m.homeProb === "number") candidates.push({ prob: m.homeProb, outcome: "home" });
      if (typeof m.drawProb === "number") candidates.push({ prob: m.drawProb, outcome: "draw" });
      if (typeof m.awayProb === "number") candidates.push({ prob: m.awayProb, outcome: "away" });
      const top = candidates.sort((a, b) => b.prob - a.prob)[0];
      if (!top) continue;
      if (!best || top.prob > best.prob) {
        best = { match: m, prob: top.prob, outcome: top.outcome };
      }
    }

    if (!best || !best.match.homeTeam || !best.match.awayTeam) {
      return null;
    }

    return {
      matchId: best.match.matchId,
      homeTeam: best.match.homeTeam,
      awayTeam: best.match.awayTeam,
      kickoffAt: best.match.kickoffIso ? new Date(best.match.kickoffIso) : null,
      predictedProb: best.prob,
      predictedOutcome: best.outcome,
    };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

function todayInLagos(now: Date): string {
  return dateInLagos(now);
}

function dateInLagos(d: Date): string {
  // Africa/Lagos is UTC+1 year-round (no DST). Format as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
