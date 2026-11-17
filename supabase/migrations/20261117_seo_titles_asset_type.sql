-- Adds the `seo_titles` asset type: the title and heading rewrite proposal
-- (POST /api/projects/[id]/titles) is stored as one asset per run so the
-- owner can come back to it, accept rows and apply them.
--
-- Mirrors 20260428_add_launch_plan_asset_type.sql: drop and re-create the
-- CHECK with the full list. Idempotent.

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE public.assets ADD CONSTRAINT assets_type_check CHECK (
  type = ANY (ARRAY[
    'landing_page'::text,
    'email'::text,
    'social_post'::text,
    'seo_page'::text,
    'seo_titles'::text,
    'meta_tags'::text,
    'copy_block'::text,
    'cta'::text,
    'headline'::text,
    'ad_copy'::text,
    'schema_markup'::text,
    'audit_report'::text,
    'blog_post'::text,
    'growth_playbook'::text,
    'launch_plan'::text
  ])
);
