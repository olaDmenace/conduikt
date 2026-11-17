-- Missing Pages: re-writing a published candidate must not un-publish the
-- live page. The new version is parked in hosted_page_revisions (page JSON,
-- its asset, its readiness), one row per live page, and the owner approves
-- it from the Missing Pages screen, which swaps it into hosted_pages.page /
-- asset_id. Until then the live row (status, page, asset_id) is untouched.
--
-- The revision lives in its own table on purpose: hosted_pages carries the
-- policy "public_reads_published_hosted_pages" (anon + authenticated may
-- read every published row), and RLS is row-level, so an unapproved rewrite
-- stored on the live row would be readable by anyone with the anon key.
-- This table has the owner policy only (plus service_role for the nightly
-- Inngest job); public pages never need it.
--
-- Written by the owner (write route, RLS owner policy) and by the nightly
-- Inngest job (service role). Idempotent.

CREATE TABLE IF NOT EXISTS public.hosted_page_revisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hosted_page_id  UUID NOT NULL REFERENCES public.hosted_pages(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- MissingPageContent (src/lib/missing-pages/types.ts), already reviewed
  page            JSONB NOT NULL,
  asset_id        UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  -- { score, ready, fixes[], applied[] } from the editor check
  readiness       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- one pending version per live page; a second rewrite replaces it
  UNIQUE (hosted_page_id)
);

CREATE INDEX IF NOT EXISTS hosted_page_revisions_project_idx
  ON public.hosted_page_revisions (project_id);

ALTER TABLE public.hosted_page_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_hosted_page_revisions" ON public.hosted_page_revisions;
CREATE POLICY "project_owner_hosted_page_revisions" ON public.hosted_page_revisions
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- The nightly Inngest run writes with the service role.
DROP POLICY IF EXISTS "service_role_hosted_page_revisions" ON public.hosted_page_revisions;
CREATE POLICY "service_role_hosted_page_revisions" ON public.hosted_page_revisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$ BEGIN
  CREATE TRIGGER trg_hosted_page_revisions_updated_at
    BEFORE UPDATE ON public.hosted_page_revisions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.hosted_page_revisions IS
  'A re-written version of a live hosted page waiting for the owner''s OK; the live page stays in hosted_pages.page until approved.';

-- An earlier draft of this migration kept the pending version in columns on
-- hosted_pages, which the public read policy exposed. Drop them if they
-- were ever applied; the draft itself is still in assets (status draft).
ALTER TABLE public.hosted_pages
  DROP COLUMN IF EXISTS pending_page,
  DROP COLUMN IF EXISTS pending_asset_id,
  DROP COLUMN IF EXISTS pending_readiness,
  DROP COLUMN IF EXISTS pending_at;
