-- Stores the daily "standout pick" the X playbook cron scrapes from
-- pitch-odds.vercel.app. Today's row is referenced by tomorrow's
-- "yesterday's result" tweet (Days 4, 9 etc).
--
-- The cron upserts on `pick_date` so re-running on the same day is idempotent.
-- `actual_outcome` and `settled_at` are nullable — they're backfilled the next
-- day when the cron looks up "did our pick from yesterday win?"

CREATE TABLE IF NOT EXISTS public.pitchodds_daily_picks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_date       date NOT NULL,
  match_id        text,                 -- pitch-odds.vercel.app/match/<id>
  home_team       text NOT NULL,
  away_team       text NOT NULL,
  kickoff_at      timestamptz,
  predicted_prob  integer NOT NULL,     -- 0–100, the highest-confidence outcome's probability
  predicted_outcome text NOT NULL,      -- "home" | "draw" | "away"
  actual_outcome  text,                 -- "home" | "draw" | "away" | "void"
  settled_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pitchodds_daily_picks_date_unique UNIQUE (pick_date),
  CONSTRAINT pitchodds_daily_picks_predicted_outcome_check
    CHECK (predicted_outcome IN ('home', 'draw', 'away')),
  CONSTRAINT pitchodds_daily_picks_actual_outcome_check
    CHECK (actual_outcome IS NULL OR actual_outcome IN ('home', 'draw', 'away', 'void'))
);

-- Service-role only — this isn't user-scoped data, just shared scraping state.
ALTER TABLE public.pitchodds_daily_picks ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Cron uses service role.

CREATE INDEX IF NOT EXISTS pitchodds_daily_picks_pick_date_idx
  ON public.pitchodds_daily_picks (pick_date DESC);
