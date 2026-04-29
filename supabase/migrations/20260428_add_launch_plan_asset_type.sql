-- Adds the `launch_plan` value to the assets.type CHECK constraint.
-- Saving from /projects/[id]/launch-strategy was failing because the
-- generated payload uses type='launch_plan' (was 'strategy_doc' previously)
-- and the existing constraint did not include it.

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE public.assets ADD CONSTRAINT assets_type_check CHECK (
  type = ANY (ARRAY[
    'landing_page'::text,
    'email'::text,
    'social_post'::text,
    'seo_page'::text,
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
