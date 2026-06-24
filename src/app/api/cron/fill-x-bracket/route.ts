import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import brackets from "@/src/lib/x-playbook/brackets.json";
// scrapeTodaysStandoutPick is dynamically imported below so Playwright/chromium
// don't load unless actually used.

// Daily filler for the X playbook's bracket posts.
// Runs at 06:00 UTC (07:00 WAT) via pg_cron, 30 min before slot A's 07:30 UTC fire.
//
// Idempotent: if today's bracket asset (matched by content.ref) already exists,
// we skip the insert.

export const maxDuration = 30; // fetch + parse only — no headless browser
export const dynamic = "force-dynamic"; // never cache — every call must run fresh

const PROJECT_ID = "22b2de3c-abf6-4b63-8989-be8da6500f78"; // Personal Brand (user A)

interface BracketTemplate {
  ref: string;
  day: number;
  slot: "A" | "B" | "C";
  type: "single" | "thread";
  needs: ("pick" | "yesterday")[];
  text: string;
}

interface FillResult {
  ref: string;
  status: "queued" | "skipped" | "failed";
  reason?: string;
}

export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (err) {
    // Surface the actual error so 500s aren't opaque — this route is only
    // hit by pg_cron + manual debugging, no user PII concern.
    console.error("[cron/fill-x-bracket] unhandled error:", err);
    return NextResponse.json(
      {
        error: "Unhandled error",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 8) : undefined,
      },
      { status: 500 }
    );
  }
}

async function handleGet(request: NextRequest) {
  // Same auth pattern as /api/cron/publish — accepts header or query param secret.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[cron/fill-x-bracket] CRON_SECRET not set — refusing");
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
    }
    console.warn("[cron/fill-x-bracket] CRON_SECRET not set — dev mode");
  } else {
    const auth = request.headers.get("authorization");
    const q = new URL(request.url).searchParams.get("secret");
    if (auth !== `Bearer ${cronSecret}` && q !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = createServiceClient();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dry") === "1";

  // ?dry=1 — run only the scraper and return the pick (don't touch DB, don't
  // require today to be in the playbook window). Useful to verify the scrape
  // path works before Friday.
  if (dryRun) {
    const { scrapeTodaysStandoutPick } = await import("@/src/lib/integrations/pitchodds-scrape");
    const pick = await scrapeTodaysStandoutPick(new Date());
    return NextResponse.json({ dryRun: true, pick });
  }

  // Compute today's playbook day (1-indexed) from the START_DATE in brackets.json.
  // Use Africa/Lagos calendar date so the day boundary matches the user's experience.
  const todayLagos = lagosDateString(new Date());
  const startDate = brackets.startDate;
  const dayN = daysBetween(startDate, todayLagos) + 1;

  if (dayN < 1 || dayN > 14) {
    return NextResponse.json({
      message: `today=${todayLagos} is outside the 14-day playbook window (day=${dayN})`,
      queued: 0,
    });
  }

  // Find every bracket template scheduled for today's day N.
  const todayTemplates = (brackets.templates as BracketTemplate[]).filter(
    (t) => t.day === dayN
  );

  if (todayTemplates.length === 0) {
    return NextResponse.json({
      message: `no bracket templates for day ${dayN} (${todayLagos})`,
      queued: 0,
    });
  }

  // Lazy-load PitchOdds data only if at least one template needs it.
  const needsPick = todayTemplates.some((t) => t.needs.includes("pick"));
  const needsYesterday = todayTemplates.some((t) => t.needs.includes("yesterday"));

  type PickType = {
    matchId: string | null;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date | null;
    predictedProb: number;
    predictedOutcome: "home" | "draw" | "away";
  } | null;
  let pick: PickType = null;
  let yesterdayPick: { home_team: string; away_team: string; predicted_prob: number; predicted_outcome: string; actual_outcome: string | null } | null = null;

  if (needsPick) {
    try {
      const { scrapeTodaysStandoutPick } = await import("@/src/lib/integrations/pitchodds-scrape");
      pick = await scrapeTodaysStandoutPick(new Date());
    } catch (err) {
      console.error("[cron/fill-x-bracket] scrape failed:", err);
      return NextResponse.json(
        { error: `PitchOdds scrape failed: ${err instanceof Error ? err.message : "unknown"}` },
        { status: 502 }
      );
    }

    if (pick) {
      // Upsert today's pick so tomorrow's "yesterday's result" tweet can reference it.
      const { error: upsertErr } = await db.from("pitchodds_daily_picks").upsert(
        {
          pick_date: todayLagos,
          match_id: pick.matchId,
          home_team: pick.homeTeam,
          away_team: pick.awayTeam,
          kickoff_at: pick.kickoffAt?.toISOString() ?? null,
          predicted_prob: pick.predictedProb,
          predicted_outcome: pick.predictedOutcome,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pick_date" }
      );
      if (upsertErr) {
        console.error("[cron/fill-x-bracket] pick upsert failed:", upsertErr);
      }
    }
  }

  if (needsYesterday) {
    const yday = lagosDateString(new Date(Date.now() - 86_400_000));
    const { data } = await db
      .from("pitchodds_daily_picks")
      .select("home_team, away_team, predicted_prob, predicted_outcome, actual_outcome")
      .eq("pick_date", yday)
      .maybeSingle();
    yesterdayPick = data ?? null;
  }

  const results: FillResult[] = [];

  for (const tmpl of todayTemplates) {
    // Idempotency — skip if today's asset for this ref already exists.
    const { data: existing } = await db
      .from("assets")
      .select("id")
      .eq("content->>ref", tmpl.ref)
      .maybeSingle();

    if (existing) {
      results.push({ ref: tmpl.ref, status: "skipped", reason: "asset already exists" });
      continue;
    }

    // Build the substitution map. If any required value is missing, skip.
    const subs: Record<string, string> = {};
    let missing: string | null = null;

    if (tmpl.needs.includes("pick")) {
      if (!pick) {
        missing = "no PitchOdds match today";
      } else {
        subs.HOME = pick.homeTeam;
        subs.AWAY = pick.awayTeam;
        subs.PROB_PCT = String(pick.predictedProb);
        subs.OUTCOME = outcomeLabel(pick.predictedOutcome);
        subs.MATCH_ID = pick.matchId ?? "";
      }
    }

    if (!missing && tmpl.needs.includes("yesterday")) {
      if (!yesterdayPick) {
        missing = "no pick recorded yesterday";
      } else if (yesterdayPick.actual_outcome === null) {
        missing = "yesterday's result not settled yet (football-data.org wiring pending)";
      } else {
        const pickedTeam =
          yesterdayPick.predicted_outcome === "home"
            ? yesterdayPick.home_team
            : yesterdayPick.predicted_outcome === "away"
              ? yesterdayPick.away_team
              : "Draw";
        subs.YDAY_TEAM = pickedTeam;
        subs.YDAY_PROB = String(yesterdayPick.predicted_prob);
        subs.YDAY_OUTCOME = describeOutcome(
          yesterdayPick.predicted_outcome,
          yesterdayPick.actual_outcome
        );
      }
    }

    if (missing) {
      results.push({ ref: tmpl.ref, status: "skipped", reason: missing });
      continue;
    }

    const filled = applyTemplate(tmpl.text, subs);

    // Compute scheduled_for: today's slot time in UTC.
    const slotUtc = (brackets.slotUtc as Record<string, string>)[tmpl.slot];
    const scheduledFor = `${todayLagos}T${slotUtc}:00Z`;

    // Skip if the slot already passed today.
    if (new Date(scheduledFor).getTime() < Date.now()) {
      results.push({ ref: tmpl.ref, status: "skipped", reason: "slot already past" });
      continue;
    }

    const { data: asset, error: aerr } = await db
      .from("assets")
      .insert({
        project_id: PROJECT_ID,
        type: "social_post",
        channel: "x",
        title: `X ${tmpl.ref}`,
        status: "approved",
        content: {
          scheduled_text: filled,
          ref: tmpl.ref,
          pillar: "pitchodds",
          kind: "bracket",
          filledFrom: subs,
        },
      })
      .select("id")
      .single();

    if (aerr || !asset) {
      results.push({ ref: tmpl.ref, status: "failed", reason: aerr?.message ?? "asset insert failed" });
      continue;
    }

    const { error: serr } = await db.from("scheduled_posts").insert({
      asset_id: asset.id,
      project_id: PROJECT_ID,
      channel: "x",
      scheduled_for: scheduledFor,
      status: "pending",
    });

    if (serr) {
      results.push({ ref: tmpl.ref, status: "failed", reason: serr.message });
      continue;
    }

    results.push({ ref: tmpl.ref, status: "queued" });
  }

  const queued = results.filter((r) => r.status === "queued").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`[cron/fill-x-bracket] day=${dayN} (${todayLagos}) queued=${queued} skipped=${skipped} failed=${failed}`);

  return NextResponse.json({
    day: dayN,
    date: todayLagos,
    queued,
    skipped,
    failed,
    results,
  });
}

// ---------- helpers ----------

function applyTemplate(text: string, subs: Record<string, string>): string {
  return text.replace(/\{([A-Z_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(subs, key) ? subs[key] : match
  );
}

function outcomeLabel(outcome: "home" | "draw" | "away"): string {
  return outcome === "draw" ? "draw" : `${outcome} win`;
}

function describeOutcome(predicted: string, actual: string): string {
  if (actual === "void") return "match voided";
  if (predicted === actual) return `it landed ✅`;
  if (actual === "home") return `home won (we said ${predicted})`;
  if (actual === "away") return `away won (we said ${predicted})`;
  if (actual === "draw") return `draw (we said ${predicted})`;
  return `${actual} (we said ${predicted})`;
}

function lagosDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}
