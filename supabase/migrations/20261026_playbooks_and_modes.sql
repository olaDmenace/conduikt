-- Playbooks and Modes (audit 2026-10-24 §4.1, decisions D1, D2, D4).
--
-- One engine, four playbooks: the business type chosen in onboarding sets
-- default channels, which agents the first-week pack runs, and the intent
-- seeds Missing Pages uses. The automation mode is the per-project
-- "how hands-on you want to be" setting from docs/DESIGN.md.
--
-- RLS policies on public.projects already exist and are not changed here.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS business_type text
    CHECK (business_type IN ('saas', 'local', 'agency', 'creator')),
  ADD COLUMN IF NOT EXISTS automation_mode text NOT NULL DEFAULT 'check_all'
    CHECK (automation_mode IN ('check_all', 'social_runs', 'hands_off')),
  ADD COLUMN IF NOT EXISTS wants_hosted_page boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_location text,
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.projects.business_type IS
  'Playbook chosen in onboarding: saas, local, agency or creator. NULL means saas (rows created before playbooks existed). See src/lib/playbooks.ts.';
COMMENT ON COLUMN public.projects.automation_mode IS
  'How hands-on the owner wants to be. check_all: nothing goes out without approval. social_runs: social posts publish on schedule, everything else waits. hands_off: everything publishes on schedule. See src/lib/automation/mode.ts.';
COMMENT ON COLUMN public.projects.wants_hosted_page IS
  'True when the owner has no website yet and asked Conduikt to build their first page from their onboarding answers.';
COMMENT ON COLUMN public.projects.business_location IS
  'City or area the business serves. Used by the local playbook for "{service} in {location}" pages and intent seeds.';
COMMENT ON COLUMN public.projects.services IS
  'What the business offers, one entry per service. Used by the local playbook to build service pages and intent seeds.';
