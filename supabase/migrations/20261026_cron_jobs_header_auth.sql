-- Re-schedule every pg_cron job that calls a /api/cron/* route so the
-- CRON_SECRET travels ONLY in the Authorization header.
--
-- Why: the three route handlers (publish, scheduler-tick, fill-x-bracket)
-- used to accept the secret as `?secret=` too, which lands in Vercel's
-- request logs. As of 2026-10-26 they accept the header form only, so any
-- job that was hand-edited in the Supabase dashboard to use the query
-- string would now get 401s. This migration makes the three jobs
-- canonical again, idempotently: unschedule by name if present, then
-- schedule with the header.
--
-- Secret source: the Postgres setting `app.cron_secret`, same as the
-- original migrations (20260404135045, 20260504, 20260624). Set it once
-- with the SAME value as the CRON_SECRET env var on Vercel:
--
--   ALTER DATABASE postgres SET app.cron_secret = '<value of CRON_SECRET>';
--
-- then reconnect (new sessions pick up the setting; pg_cron workers open a
-- fresh session per run so they see it on the next tick). Verify with:
--
--   SELECT jobid, jobname, schedule, command FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- pg_cron and pg_net are already enabled on this project.

DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'publish-scheduled-posts',
    'scheduler-tick',
    'fill-x-bracket-daily'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;
END
$$;

-- Every 5 minutes: publish due scheduled_posts.
SELECT cron.schedule(
  'publish-scheduled-posts',
  '*/5 * * * *',
  $$
    SELECT net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/publish',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $$
);

-- Every 5 minutes: dispatch due scheduled_executions (email steps, playbooks).
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

-- Daily 06:00 UTC: X-playbook bracket filler.
SELECT cron.schedule(
  'fill-x-bracket-daily',
  '0 6 * * *',
  $$
    SELECT net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/fill-x-bracket',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $$
);
