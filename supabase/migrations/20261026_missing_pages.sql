-- Missing Pages: "finds the searches you have no page for, writes the
-- page, puts it live".
--
-- missing_page_candidates: one row per (project, search phrase). Written
-- by every run (crawl -> intents -> gaps -> volume -> score); the status
-- survives re-runs so a dismissed phrase stays dismissed.
--
-- missing_page_runs: one row per run (manual button or the 2am nightly),
-- with counts and the error if it stopped early.
--
-- projects.missing_pages_enabled: the nightly opt-in. Off by default; the
-- Inngest cron only fans out to projects that turned it on.
--
-- Depends on 20261026_hosted_pages.sql (hosted_pages).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS missing_pages_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.missing_page_candidates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  query            TEXT NOT NULL,
  -- 'new': no page answers this search. 'update': a weak match exists and
  -- should be revised instead of duplicated.
  kind             TEXT NOT NULL DEFAULT 'new' CHECK (kind IN ('new', 'update')),
  matched_url      TEXT,
  match_score      NUMERIC(4,3) NOT NULL DEFAULT 0,
  monthly_searches INTEGER,
  competition      TEXT CHECK (competition IN ('low', 'medium', 'high')),
  -- true when monthly_searches came from a seed default, not a provider
  estimated        BOOLEAN NOT NULL DEFAULT false,
  score            NUMERIC(8,3) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'writing', 'drafted', 'published', 'dismissed', 'failed')),
  asset_id         UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  hosted_page_id   UUID REFERENCES public.hosted_pages(id) ON DELETE SET NULL,
  -- answer readiness of the latest draft: { score, ready, fixes[] }
  readiness        JSONB,
  last_error       TEXT,
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, query)
);

CREATE INDEX IF NOT EXISTS missing_page_candidates_project_idx
  ON public.missing_page_candidates (project_id, status, score DESC);

ALTER TABLE public.missing_page_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_missing_page_candidates" ON public.missing_page_candidates;
CREATE POLICY "project_owner_missing_page_candidates" ON public.missing_page_candidates
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  CREATE TRIGGER trg_missing_page_candidates_updated_at
    BEFORE UPDATE ON public.missing_page_candidates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.missing_page_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  mode             TEXT NOT NULL CHECK (mode IN ('nightly', 'manual')),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ,
  pages_crawled    INTEGER NOT NULL DEFAULT 0,
  queries_checked  INTEGER NOT NULL DEFAULT 0,
  gaps_found       INTEGER NOT NULL DEFAULT 0,
  pages_written    INTEGER NOT NULL DEFAULT 0,
  pages_published  INTEGER NOT NULL DEFAULT 0,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS missing_page_runs_project_idx
  ON public.missing_page_runs (project_id, started_at DESC);

ALTER TABLE public.missing_page_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_missing_page_runs" ON public.missing_page_runs;
CREATE POLICY "project_owner_missing_page_runs" ON public.missing_page_runs
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );
