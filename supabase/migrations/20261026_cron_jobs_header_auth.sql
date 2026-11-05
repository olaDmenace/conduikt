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

-- SAFETY (added 2026-11-05 after inspecting production): the live jobs
-- 'publish-scheduled-posts' and 'scheduler-tick' already send the header,
-- with the secret embedded as a literal, and app.cron_secret is NOT set on
-- the database. Re-scheduling them with current_setting() would send a
-- NULL header and stop publishing. So this migration only re-schedules
-- when app.cron_secret is set; otherwise it leaves every job untouched.
-- Set the GUC first (see above), then re-run this file.

DO $mig$
DECLARE
  job_name text;
  secret text := current_setting('app.cron_secret', true);
BEGIN
  IF secret IS NULL OR secret = '' THEN
    RAISE NOTICE 'app.cron_secret is not set; leaving existing cron jobs untouched';
    RETURN;
  END IF;

  FOREACH job_name IN ARRAY ARRAY[
    'publish-scheduled-posts',
    'scheduler-tick',
    'fill-x-bracket-daily'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;

-- Every 5 minutes: publish due scheduled_posts.
  PERFORM cron.schedule(
  'publish-scheduled-posts',
  '*/5 * * * *',
  $cmd$
    SELECT net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/publish',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $cmd$
);

-- Every 5 minutes: dispatch due scheduled_executions (email steps, playbooks).
  PERFORM cron.schedule(
  'scheduler-tick',
  '*/5 * * * *',
  $cmd$
    SELECT net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/scheduler-tick',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $cmd$
);

-- Daily 06:00 UTC: X-playbook bracket filler.
  PERFORM cron.schedule(
  'fill-x-bracket-daily',
  '0 6 * * *',
  $cmd$
    SELECT net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/fill-x-bracket',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $cmd$
);
END
$mig$;
