-- Shared rate-limit counters (audit: platform hardening).
--
-- src/lib/security/rate-limit.ts used to count requests in a module-level
-- Map. On Vercel every lambda instance has its own Map, so a burst spread
-- over instances was never limited. The counters now live here, one row
-- per key, bumped atomically by rate_limit_hit(). The app reaches the table
-- only through the service role (no user policies), and falls back to the
-- in-memory Map when the RPC is unavailable (local dev, tests).
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT PRIMARY KEY,
  count        INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL
);

-- Lets rate_limit_prune() drop stale rows without a sequential scan.
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
  ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only: RLS is on and there are deliberately no policies, so
-- anon/authenticated get nothing even if the grants below were ever widened.
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.rate_limits IS
  'Fixed-window request counters keyed by route + user/IP. Written only by rate_limit_hit() via the service role; see src/lib/security/rate-limit.ts.';

-- Take one or more slots from the window for p_key.
--
-- A single INSERT ... ON CONFLICT DO UPDATE ... RETURNING does the whole
-- read-modify-write under the row lock, so concurrent hits from different
-- lambdas cannot both see "count = limit - 1". When the stored window has
-- expired the row is reset to a fresh window starting now; otherwise the
-- count is bumped by p_cost (default 1; a paste of 50 rows takes 50).
--
-- Slots taken before a refusal stay taken: the count is incremented even
-- when the hit is refused, which is what stops a refused batch from being
-- split into ones that fit.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key            TEXT,
  p_limit          INT,
  p_window_seconds INT,
  p_cost           INT DEFAULT 1
)
RETURNS TABLE (allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now    TIMESTAMPTZ := clock_timestamp();
  v_window INTERVAL    := make_interval(secs => GREATEST(p_window_seconds, 1));
  v_cost   INT         := GREATEST(p_cost, 1);
  v_count  INT;
  v_start  TIMESTAMPTZ;
BEGIN
  INSERT INTO public.rate_limits AS r (key, count, window_start)
  VALUES (p_key, v_cost, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
                  WHEN r.window_start + v_window <= v_now THEN v_cost
                  ELSE r.count + v_cost
                END,
        window_start = CASE
                  WHEN r.window_start + v_window <= v_now THEN v_now
                  ELSE r.window_start
                END
  RETURNING r.count, r.window_start INTO v_count, v_start;

  -- Opportunistic cleanup: roughly one hit in a hundred sweeps rows whose
  -- window closed more than a day ago. rate_limit_prune() does the same on
  -- a schedule if pg_cron is wired up.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
    WHERE window_start < v_now - INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT
    v_count <= p_limit,
    GREATEST(p_limit - v_count, 0),
    v_start + v_window;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, INT) TO service_role;

COMMENT ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, INT) IS
  'Atomically takes p_cost slots from the fixed window for p_key. Returns allowed, slots remaining and when the window resets.';

-- Cron-friendly sweep of rows nobody will read again. Any row whose window
-- started more than a day ago is past every window the app uses (the
-- longest is one hour). Returns how many rows went.
CREATE OR REPLACE FUNCTION public.rate_limit_prune()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < clock_timestamp() - INTERVAL '1 day';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_prune() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_prune() TO service_role;

COMMENT ON FUNCTION public.rate_limit_prune() IS
  'Deletes rate_limits rows older than one day. Safe to run from pg_cron hourly.';
