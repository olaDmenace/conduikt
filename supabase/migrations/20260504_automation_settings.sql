-- Per-user automation trust settings.
--
-- Each row represents one user's tolerance for the Growth Playbook
-- auto-publishing on their behalf, broken out by channel:
--   off    — open the tool with a draft pre-filled, user publishes manually
--   review — generate, drop in queue with a 24h hold, publish unless cancelled
--   auto   — generate and queue for next-tick publish (no hold)
--
-- We only auto-publish to channels we own the publish path for: X and
-- LinkedIn. Email broadcasts and blog posts stay manual for V1
-- (broadcasts already have their own send UI; blogs are user-owned
-- surfaces we can't push to).
--
-- The actual queue uses scheduled_executions (execution_type='playbook_action')
-- so we don't duplicate the cron + retry primitive.

CREATE TABLE IF NOT EXISTS public.automation_settings (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Per-channel mode. Defaults reflect the trust gradient suggested in
  -- product docs: high-volume X gets auto, professional LinkedIn gets
  -- review-first.
  x_mode         TEXT NOT NULL DEFAULT 'auto'
                   CHECK (x_mode IN ('off','review','auto')),
  linkedin_mode  TEXT NOT NULL DEFAULT 'review'
                   CHECK (linkedin_mode IN ('off','review','auto')),
  -- Hold window in hours for 'review' mode. 24h matches the design
  -- but is configurable per user.
  review_hold_hours INTEGER NOT NULL DEFAULT 24
                      CHECK (review_hold_hours >= 1 AND review_hold_hours <= 168),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_automation_settings" ON public.automation_settings;
CREATE POLICY "user_owns_automation_settings" ON public.automation_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER trg_automation_settings_updated_at
    BEFORE UPDATE ON public.automation_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
