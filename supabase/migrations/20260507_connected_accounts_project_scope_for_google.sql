-- Per-project scoping for Google integrations (GSC, GA4, YouTube).
--
-- Why this change:
-- * X / LinkedIn / Facebook are publishing destinations — each user has
--   ONE social account and uses it across all their projects. User-level
--   scope is the right shape there.
-- * Google integrations (GSC, GA4, YouTube) are READ sources tied to
--   specific websites or channels. An agency managing 5 clients needs 5
--   independent Google connections, one per project. User-level scope
--   forced them to disconnect/reconnect/resync to switch contexts. This
--   makes per-project the dedicated path for Google sources.
--
-- Design:
-- * `project_id` is NULL for social rows (legacy semantic), NOT NULL for
--   Google rows.
-- * Two partial unique indexes enforce the right uniqueness per shape:
--   one social per user, one Google service per project.
-- * Existing Google rows are dropped — there are no real subscribers
--   yet, only test data, so a clean reconnect-per-project flow is fine.

-- 1. Add the column (nullable for now).
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- 2. Index for join performance — most queries filter by project_id.
CREATE INDEX IF NOT EXISTS idx_connected_accounts_project
  ON public.connected_accounts(project_id);

-- 3. Drop existing Google rows (test data only, zero real subscribers).
--    Users will reconnect per project under the new flow.
DELETE FROM public.connected_accounts
  WHERE platform IN ('gsc', 'ga4', 'youtube');

-- 4. Drop the old uniform constraint.
ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_user_id_platform_key;

-- 5. Two partial unique indexes encode the polymorphic uniqueness:
--    - Social platforms: still one connection per (user, platform).
--    - Google platforms: one connection per (project, platform).
CREATE UNIQUE INDEX IF NOT EXISTS connected_accounts_user_platform_unique
  ON public.connected_accounts(user_id, platform)
  WHERE project_id IS NULL
    AND platform IN ('x', 'linkedin', 'facebook');

CREATE UNIQUE INDEX IF NOT EXISTS connected_accounts_project_platform_unique
  ON public.connected_accounts(project_id, platform)
  WHERE project_id IS NOT NULL
    AND platform IN ('gsc', 'ga4', 'youtube');

-- 6. Belt-and-braces CHECK: project_id presence must match platform shape.
--    Catches any app-side bug that tries to insert a Google row without a
--    project_id, or a social row WITH one.
ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_project_scope_check;

ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_project_scope_check
  CHECK (
    (platform IN ('gsc', 'ga4', 'youtube') AND project_id IS NOT NULL)
    OR
    (platform IN ('x', 'linkedin', 'facebook') AND project_id IS NULL)
  );
