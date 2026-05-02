-- Allow facebook as a platform / channel value
ALTER TABLE connected_accounts DROP CONSTRAINT IF EXISTS connected_accounts_platform_check;
ALTER TABLE connected_accounts
  ADD CONSTRAINT connected_accounts_platform_check
  CHECK (platform = ANY (ARRAY['x'::text, 'linkedin'::text, 'gsc'::text, 'facebook'::text]));

ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_channel_check;
ALTER TABLE scheduled_posts
  ADD CONSTRAINT scheduled_posts_channel_check
  CHECK (channel = ANY (ARRAY['x'::text, 'linkedin'::text, 'email'::text, 'facebook'::text]));

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_channel_check;
ALTER TABLE assets
  ADD CONSTRAINT assets_channel_check
  CHECK (channel = ANY (ARRAY['x'::text, 'linkedin'::text, 'email'::text, 'web'::text, 'google_ads'::text, 'meta_ads'::text, 'facebook'::text]));
