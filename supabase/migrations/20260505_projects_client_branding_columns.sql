-- Add the per-project "client branding" columns the dashboard +
-- white-label PDF routes already read/write but which were never
-- migrated. Until this lands, /settings (per-project) logo upload
-- silently succeeds at the storage layer and then errors with
-- `Could not find the 'client_logo_url' column of 'projects' in the
-- schema cache` when the URL save tries to PATCH the project.
--
-- Columns:
--   client_name          — display name for white-label reports (e.g.
--                          "Acme Corp" overrides Conduikt branding on
--                          PDF audits and analytics).
--   client_logo_url      — public URL to the per-project client logo,
--                          uploaded via /settings/[id] page.
--   report_accent_color  — hex string used as the accent on generated
--                          PDF reports. Defaults to the brand orange.
--
-- These are project-scoped (not profile-scoped) because Agency users
-- run multiple clients per account — each project represents one
-- client and gets its own branding.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_name         TEXT,
  ADD COLUMN IF NOT EXISTS client_logo_url     TEXT,
  ADD COLUMN IF NOT EXISTS report_accent_color TEXT DEFAULT '#D9663A';
