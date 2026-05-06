-- Expand the connected_accounts.platform CHECK constraint to include
-- ga4 and youtube. Without this, the GA4 and YouTube OAuth callbacks
-- complete the token exchange successfully but fail at the upsert step
-- with a CHECK constraint violation, surfacing as "Failed to save GA4
-- connection" / "Failed to save YouTube connection" in the UI.
--
-- The original CHECK was added when only X, LinkedIn, GSC, and Facebook
-- were the supported integrations; GA4 and YouTube were wired up later
-- without updating the constraint. Order of array values is alphabetical
-- to make future additions easier to place.
ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_platform_check;

ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_platform_check
  CHECK (platform = ANY (ARRAY['facebook'::text, 'ga4'::text, 'gsc'::text, 'linkedin'::text, 'x'::text, 'youtube'::text]));
