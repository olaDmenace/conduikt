-- Database-backed blog posts. Replaces the static src/content/blog/posts.ts
-- with a queryable table so the campaign blog-post agent's output can be
-- published to conduikt.com/blog/[slug] without a code commit + Vercel
-- rebuild for every new post.
--
-- Two render formats coexist on the same row:
-- * sections: jsonb — array of {heading, body[]} from the original
--   hand-written posts in posts.ts
-- * content_markdown: text — the format the blog-post agent produces
-- The blog detail page renders whichever is non-null.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  excerpt               TEXT NOT NULL,
  author                TEXT NOT NULL DEFAULT 'Olayinka Fagbenro',
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  reading_time_minutes  INTEGER,
  sections              JSONB,
  content_markdown      TEXT,
  meta_title            TEXT,
  meta_description      TEXT,
  featured_image_query  TEXT,
  cta                   JSONB NOT NULL DEFAULT
    '{"label":"Try Conduikt free","href":"/signup"}'::jsonb,
  date_published        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_modified         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT NOT NULL DEFAULT 'published',
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id            UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  source_asset_id       UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_posts_slug_unique UNIQUE (slug),
  CONSTRAINT blog_posts_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT blog_posts_has_content
    CHECK (sections IS NOT NULL OR content_markdown IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_date
  ON public.blog_posts(status, date_published DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_user
  ON public.blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_project
  ON public.blog_posts(project_id);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_public_select" ON public.blog_posts;
CREATE POLICY "blog_posts_public_select" ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "blog_posts_owner_select" ON public.blog_posts;
CREATE POLICY "blog_posts_owner_select" ON public.blog_posts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "blog_posts_owner_write" ON public.blog_posts;
CREATE POLICY "blog_posts_owner_write" ON public.blog_posts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER trg_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill of the 3 original static posts is intentionally NOT in this
-- file because the seed JSON is large and editor-noisy. The backfill was
-- applied directly via mcp__supabase__apply_migration on first run; if
-- you rebuild the DB from migrations you'll re-import the same content
-- via a follow-up seed migration.
