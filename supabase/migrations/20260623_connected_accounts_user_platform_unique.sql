-- Fix: add the UNIQUE constraint that every OAuth callback's upsert needs.
--
-- The X, LinkedIn, Facebook, and TikTok integration callbacks all upsert with
--   .upsert({...}, { onConflict: "user_id,platform" })
-- which requires a UNIQUE constraint on (user_id, platform). Without it
-- Postgres returns 42P10 ("there is no unique or exclusion constraint
-- matching the ON CONFLICT specification"). The callbacks don't check the
-- error, so the user sees a success toast and gets no DB row.
--
-- This adds the missing constraint. Existing rows are already distinct on
-- (user_id, platform), so the ALTER is safe.

ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_user_platform_key UNIQUE (user_id, platform);
