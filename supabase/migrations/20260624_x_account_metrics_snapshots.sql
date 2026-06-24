-- Daily snapshot of @olayinkafag's public X metrics, captured by the
-- bracket-filler cron at 06:00 UTC each day. The Day 1 row is the
-- {FOLLOWERS_START} baseline referenced by Day 7 and Day 14 recap posts.

CREATE TABLE IF NOT EXISTS public.x_account_metrics_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   date NOT NULL,
  platform_user_id text NOT NULL,
  followers_count integer NOT NULL,
  following_count integer,
  tweet_count     integer,
  listed_count    integer,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT x_account_metrics_unique UNIQUE (snapshot_date, platform_user_id)
);

CREATE INDEX IF NOT EXISTS x_account_metrics_snapshots_date_idx
  ON public.x_account_metrics_snapshots (snapshot_date DESC);

-- Service-role only — no client access needed.
ALTER TABLE public.x_account_metrics_snapshots ENABLE ROW LEVEL SECURITY;
