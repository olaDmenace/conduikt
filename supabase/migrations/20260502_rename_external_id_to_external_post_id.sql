-- Align scheduled_posts column name with the rest of the app.
-- post_metrics, sync routes, and Inngest function all use `external_post_id`.
-- Without this rename, every metrics-sync query targeted a column that
-- did not exist and silently returned 0 rows.
ALTER TABLE public.scheduled_posts RENAME COLUMN external_id TO external_post_id;
