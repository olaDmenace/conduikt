-- Allow 'tiktok' as a platform / channel value.
--
-- Without this the OAuth callback completes successfully but the upsert
-- into connected_accounts violates connected_accounts_platform_check,
-- and any scheduled tiktok post fails scheduled_posts_channel_check.
--
-- Keep the array alphabetical so future additions slot in cleanly.

ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_platform_check;

ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_platform_check
  CHECK (platform = ANY (ARRAY[
    'facebook'::text,
    'ga4'::text,
    'gsc'::text,
    'linkedin'::text,
    'tiktok'::text,
    'x'::text,
    'youtube'::text
  ]));

ALTER TABLE public.scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_channel_check;

ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_channel_check
  CHECK (channel = ANY (ARRAY[
    'email'::text,
    'facebook'::text,
    'linkedin'::text,
    'tiktok'::text,
    'x'::text
  ]));

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_channel_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_channel_check
  CHECK (channel = ANY (ARRAY[
    'email'::text,
    'facebook'::text,
    'google_ads'::text,
    'linkedin'::text,
    'meta_ads'::text,
    'tiktok'::text,
    'web'::text,
    'x'::text
  ]));
