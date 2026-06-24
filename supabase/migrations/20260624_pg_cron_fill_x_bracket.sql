-- Schedule the X-playbook bracket-filler to run at 06:00 UTC daily (07:00 WAT),
-- 30 minutes before slot A fires at 07:30 UTC.
--
-- pg_cron and pg_net are already enabled. The CRON_SECRET is read from
-- `app.cron_secret` (same as the publish job). Returns immediately — the
-- route handler does its own work async.

select cron.schedule(
  'fill-x-bracket-daily',
  '0 6 * * *',
  $$
    select net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/fill-x-bracket',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $$
);
