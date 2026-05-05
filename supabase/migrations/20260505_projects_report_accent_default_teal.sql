-- The report_accent_color default was '#D9663A' (copper) when the column
-- was added — that matched the prior brand. Conduikt has since moved to
-- teal-as-primary, with copper demoted to a secondary accent. This brings
-- the default + backfilled rows into alignment with the new palette.
--
-- Safe to backfill all rows currently sitting on the old copper default
-- because:
--   1. The column was added in the same release window as this migration,
--      so any '#D9663A' value is the auto-applied DEFAULT, not a deliberate
--      Agency white-label override.
--   2. The Agency white-label override UI is not yet shipped, so no user
--      has had the opportunity to explicitly choose copper.
--
-- If a future Agency user *does* want copper for their reports, they can
-- set it through the UI; the override path is independent of this default.

ALTER TABLE public.projects
  ALTER COLUMN report_accent_color SET DEFAULT '#2F8C85';

UPDATE public.projects
SET report_accent_color = '#2F8C85'
WHERE report_accent_color = '#D9663A';
