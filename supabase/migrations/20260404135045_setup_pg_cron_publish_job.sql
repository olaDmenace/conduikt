-- Schedule the publish cron job to run every 5 minutes.
-- pg_cron and pg_net are already enabled on this project.
-- The job calls the /api/cron/publish endpoint on the production Vercel deployment.
-- The CRON_SECRET is read from Postgres GUC `app.cron_secret` — set it via:
--   ALTER DATABASE postgres SET app.cron_secret = '<your secret>';
-- Or manage via Supabase Vault.

select cron.schedule(
  'publish-scheduled-posts',        -- job name (unique)
  '*/5 * * * *',                    -- every 5 minutes
  $$
    select net.http_get(
      url := 'https://conduikt.vercel.app/api/cron/publish',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )
    )
  $$
);
