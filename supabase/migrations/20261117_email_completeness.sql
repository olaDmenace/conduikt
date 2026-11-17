-- Email marketing completeness (Nov 2026 closeout).
--
-- 1. Custom sending domain: verified_domains gains the configurable
--    local part ("hello" in hello@yourdomain.com) and a last-checked
--    timestamp so the settings page can say when we last asked Resend.
-- 2. Double opt-in: audiences.double_opt_in; audience_contacts gains the
--    'pending' status, a confirm token, confirm_sent_at, confirmed_at and
--    the sequence the contact will be enrolled in once they confirm.
-- 3. Suppression: audience_contacts gains the 'suppressed' status (manual
--    or pasted suppression list). Bounce/complaint suppression keeps the
--    existing 'bounced' / 'complained' statuses.
--
-- Idempotent: safe to re-run. Depends on 20260504_email_marketing_v1.sql.

-- =============================================================================
-- 1. verified_domains: local part + last check
-- =============================================================================

ALTER TABLE public.verified_domains
  ADD COLUMN IF NOT EXISTS from_local_part TEXT NOT NULL DEFAULT 'hello',
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Only lowercase letters, digits, dots, hyphens and underscores; 1-64 chars.
ALTER TABLE public.verified_domains
  DROP CONSTRAINT IF EXISTS verified_domains_from_local_part_check;
ALTER TABLE public.verified_domains
  ADD CONSTRAINT verified_domains_from_local_part_check
  CHECK (from_local_part ~ '^[a-z0-9][a-z0-9._-]{0,63}$');

-- =============================================================================
-- 2. Double opt-in
-- =============================================================================

ALTER TABLE public.audiences
  ADD COLUMN IF NOT EXISTS double_opt_in BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.audience_contacts
  ADD COLUMN IF NOT EXISTS confirm_token       TEXT,
  ADD COLUMN IF NOT EXISTS confirm_sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ,
  -- The sequence a pending contact joins once they confirm (from the lead
  -- form that captured them). Null when nothing is waiting on confirmation.
  ADD COLUMN IF NOT EXISTS pending_sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audience_contacts_confirm_token
  ON public.audience_contacts(confirm_token)
  WHERE confirm_token IS NOT NULL;

-- =============================================================================
-- 3. Status values: add 'pending' and 'suppressed'
-- =============================================================================

ALTER TABLE public.audience_contacts
  DROP CONSTRAINT IF EXISTS audience_contacts_status_check;
ALTER TABLE public.audience_contacts
  ADD CONSTRAINT audience_contacts_status_check
  CHECK (status IN ('pending','subscribed','unsubscribed','bounced','complained','suppressed'));

-- =============================================================================
-- RLS: nothing new to open. verified_domains, audiences and
-- audience_contacts keep their owner policies from 20260504. The public
-- /confirm and /unsubscribe paths run under the service-role client, which
-- bypasses RLS by design (no session on those pages).
-- =============================================================================
