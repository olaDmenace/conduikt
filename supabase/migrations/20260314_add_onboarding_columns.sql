-- Add onboarding-specific columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS audience_pain_point text,
  ADD COLUMN IF NOT EXISTS online_channels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_voice_example text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
