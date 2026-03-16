-- Add client branding columns for white-label PDF reports (Agency tier)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_logo_url text,
  ADD COLUMN IF NOT EXISTS report_accent_color text DEFAULT '#D4945A';
