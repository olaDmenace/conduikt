-- Generic execution scheduler.
--
-- A single queue table for any background work that needs to fire later:
-- email-sequence steps, growth-playbook actions, future scheduled jobs.
--
-- The cron endpoint (/api/cron/scheduler-tick) runs every 5 minutes,
-- pulls due rows, dispatches by execution_type to a registered handler,
-- and writes back status + result. Handlers are pure async functions
-- that take payload and return either {ok:true,result} or
-- {ok:false,error,retryable}. Failed-but-retryable rows are re-queued
-- with exponential backoff up to max_attempts.
--
-- Idempotency: callers can pass an idempotency_key to dedupe enqueues
-- (insert is ON CONFLICT DO NOTHING). Useful so re-running an enrollment
-- doesn't double-schedule the same step.
--
-- RLS: users read their own rows for dashboard display; only the
-- service-role client (cron endpoint) writes.

CREATE TABLE IF NOT EXISTS public.scheduled_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_type    TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for     TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed','cancelled')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 3,
  last_error        TEXT,
  -- Optional dedup key — same key = same logical job.
  idempotency_key   TEXT,
  -- Optional grouping for UI: e.g. parent_type='email_sequence_enrollment'
  -- + parent_id=<enrollment uuid> lets the dashboard show "this sequence
  -- has 5 steps queued, 2 sent".
  parent_id         UUID,
  parent_type       TEXT,
  result            JSONB,
  ran_at            TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup constraint — a unique key always points to one row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_executions_idempotency
  ON public.scheduled_executions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Hot path: cron tick query.
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_due
  ON public.scheduled_executions(scheduled_for)
  WHERE status = 'pending';

-- Dashboard / cleanup queries.
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_user_status
  ON public.scheduled_executions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_executions_parent
  ON public.scheduled_executions(parent_type, parent_id)
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.scheduled_executions ENABLE ROW LEVEL SECURITY;

-- Users can read their own executions (for queue dashboards). Writes are
-- service-role only — no insert/update/delete via the client.
DROP POLICY IF EXISTS "user_reads_own_executions" ON public.scheduled_executions;
CREATE POLICY "user_reads_own_executions" ON public.scheduled_executions
  FOR SELECT
  USING (user_id = auth.uid());

-- updated_at trigger (reuses the shared function).
DO $$ BEGIN
  CREATE TRIGGER trg_scheduled_executions_updated_at
    BEFORE UPDATE ON public.scheduled_executions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Schedule the scheduler tick to run every 5 minutes via pg_cron.
-- Same secret pattern as publish-scheduled-posts.
SELECT cron.schedule(
  'scheduler-tick',
  '*/5 * * * *',
  $$
    SELECT net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/scheduler-tick',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $$
);
