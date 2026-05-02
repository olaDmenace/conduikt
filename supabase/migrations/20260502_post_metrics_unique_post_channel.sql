-- Required for the upserts in sync-social-metrics, x/sync-metrics, and
-- linkedin/sync-metrics, all of which use onConflict: "scheduled_post_id,channel".
-- Without this index those upserts error on the second sync of any post.
CREATE UNIQUE INDEX IF NOT EXISTS post_metrics_scheduled_post_channel_idx
  ON public.post_metrics (scheduled_post_id, channel);
