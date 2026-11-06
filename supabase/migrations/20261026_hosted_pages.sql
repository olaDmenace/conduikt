-- Hosted pages and publish targets for Missing Pages.
--
-- site_connections: where a project's pages go live. One row per
-- (project, kind). 'hosted' means Conduikt serves the page itself at
-- {site_slug}.conduikt.site (or /p/{site_slug}/{slug} on conduikt.com);
-- 'wordpress' means we push to the customer's WordPress through the REST
-- API with an Application Password, stored encrypted (lib/crypto/tokens).
--
-- hosted_pages: the page JSON an agent wrote, rendered by
-- src/lib/hosted-pages/render.tsx. Drafts are private to the owner;
-- published rows are readable by anyone (the public route uses the
-- service client, but the anon policy keeps the data model honest).
--
-- Runs before 20261026_missing_pages.sql (alphabetical), which references
-- hosted_pages from missing_page_candidates.

CREATE TABLE IF NOT EXISTS public.site_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('hosted', 'wordpress')),
  -- hosted: the subdomain label ({site_slug}.conduikt.site). Globally unique.
  site_slug        TEXT,
  -- wordpress: https://example.com (no trailing slash)
  base_url         TEXT,
  username         TEXT,
  -- wordpress: Application Password, AES-256-GCM via encryptToken()
  secret_encrypted TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, kind)
);

CREATE UNIQUE INDEX IF NOT EXISTS site_connections_site_slug_key
  ON public.site_connections (site_slug)
  WHERE site_slug IS NOT NULL;

ALTER TABLE public.site_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_site_connections" ON public.site_connections;
CREATE POLICY "project_owner_site_connections" ON public.site_connections
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  CREATE TRIGGER trg_site_connections_updated_at
    BEFORE UPDATE ON public.site_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.hosted_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- The site this page belongs to ({site_slug}.conduikt.site). Copied from
  -- site_connections.site_slug at creation; defaults to a slug of the
  -- project name.
  site_slug        TEXT NOT NULL,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  meta_description TEXT,
  -- MissingPageContent (src/lib/missing-pages/types.ts)
  page             JSONB NOT NULL,
  template         TEXT NOT NULL DEFAULT 'service'
                     CHECK (template IN ('service', 'local', 'launch')),
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published')),
  published_at     TIMESTAMPTZ,
  asset_id         UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_slug, slug)
);

CREATE INDEX IF NOT EXISTS hosted_pages_project_idx
  ON public.hosted_pages (project_id, status);

ALTER TABLE public.hosted_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_hosted_pages" ON public.hosted_pages;
CREATE POLICY "project_owner_hosted_pages" ON public.hosted_pages
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Anyone may read a published page. Drafts stay with the owner.
DROP POLICY IF EXISTS "public_reads_published_hosted_pages" ON public.hosted_pages;
CREATE POLICY "public_reads_published_hosted_pages" ON public.hosted_pages
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DO $$ BEGIN
  CREATE TRIGGER trg_hosted_pages_updated_at
    BEFORE UPDATE ON public.hosted_pages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
