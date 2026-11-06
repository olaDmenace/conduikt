-- Instagram, WhatsApp and Meta Ads as connection / channel values, plus the
-- consent columns WhatsApp messaging needs (audit 2026-10-24 §6 items 1 and
-- 2, execution plan WS-F).
--
-- Follows the drop/add pattern of 20260519_add_tiktok_channel.sql. Keep the
-- arrays alphabetical so future additions slot in cleanly.
--
-- Instagram has no connected_accounts row of its own: it publishes through
-- the Facebook Page's connected Instagram Business account using the Page
-- token already stored on the 'facebook' row. It still needs to be a legal
-- scheduled_posts.channel and assets.channel value.
--
-- 'meta_ads' and 'whatsapp' are per-project connections (project_id NOT
-- NULL), the same shape as the Google sources in
-- 20260507_connected_accounts_project_scope_for_google.sql.

-- ---------------------------------------------------------------------------
-- 1. connected_accounts.platform
-- ---------------------------------------------------------------------------

ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_platform_check;

ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_platform_check
  CHECK (platform = ANY (ARRAY[
    'facebook'::text,
    'ga4'::text,
    'gsc'::text,
    'linkedin'::text,
    'meta_ads'::text,
    'tiktok'::text,
    'whatsapp'::text,
    'x'::text,
    'youtube'::text
  ]));

-- Per-connection settings that have no column of their own: the chosen ad
-- account for 'meta_ads', the display phone number and business account id
-- for 'whatsapp'. Never tokens; those stay in the encrypted token columns.
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Project scope: meta_ads and whatsapp are per project. 'tiktok' was added
-- to the platform check in May but never to this constraint, which would
-- reject every TikTok row once the constraint is enforced; it is added to
-- the user-scoped list here.
ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_project_scope_check;

ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_project_scope_check
  CHECK (
    (platform IN ('gsc', 'ga4', 'youtube', 'meta_ads', 'whatsapp') AND project_id IS NOT NULL)
    OR
    (platform IN ('x', 'linkedin', 'facebook', 'tiktok') AND project_id IS NULL)
  );

DROP INDEX IF EXISTS public.connected_accounts_project_platform_unique;
CREATE UNIQUE INDEX IF NOT EXISTS connected_accounts_project_platform_unique
  ON public.connected_accounts(project_id, platform)
  WHERE project_id IS NOT NULL
    AND platform IN ('gsc', 'ga4', 'youtube', 'meta_ads', 'whatsapp');

-- Note: connected_accounts_user_platform_key UNIQUE (user_id, platform) from
-- 20260623 still applies, so one user can hold one meta_ads and one whatsapp
-- connection across all their projects (the same limit the Google sources
-- already have). The connect routes insert-or-update by (project_id,
-- platform) and surface a plain error on a unique violation.

-- ---------------------------------------------------------------------------
-- 2. scheduled_posts.channel and assets.channel
-- ---------------------------------------------------------------------------

ALTER TABLE public.scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_channel_check;

ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_channel_check
  CHECK (channel = ANY (ARRAY[
    'email'::text,
    'facebook'::text,
    'instagram'::text,
    'linkedin'::text,
    'tiktok'::text,
    'whatsapp'::text,
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
    'instagram'::text,
    'linkedin'::text,
    'meta_ads'::text,
    'tiktok'::text,
    'web'::text,
    'whatsapp'::text,
    'x'::text
  ]));

-- ---------------------------------------------------------------------------
-- 3. WhatsApp consent on contacts (NDPA 2023 and Meta's opt-in policy)
-- ---------------------------------------------------------------------------

ALTER TABLE public.audience_contacts
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.audience_contacts.phone IS
  'Mobile number in international form without plus sign, e.g. 2348031234567. Normalised by src/lib/integrations/whatsapp.ts.';
COMMENT ON COLUMN public.audience_contacts.whatsapp_opt_in IS
  'True only after the contact agreed to receive WhatsApp messages. The whatsapp_step handler refuses to send when this is false. Set to false again on an inbound STOP.';
COMMENT ON COLUMN public.audience_contacts.whatsapp_opt_in_at IS
  'When consent was recorded. Keep it: NDPA 2023 asks for evidence of consent.';

CREATE INDEX IF NOT EXISTS idx_audience_contacts_phone
  ON public.audience_contacts(phone)
  WHERE phone IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Sequence steps can be WhatsApp steps
-- ---------------------------------------------------------------------------

ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'whatsapp'));

COMMENT ON COLUMN public.email_sequence_steps.channel IS
  'email (default) sends through Resend via the email_sequence_step handler; whatsapp sends through the WhatsApp Cloud API via the whatsapp_step handler.';

-- ---------------------------------------------------------------------------
-- 5. WhatsApp delivery and inbound events (the email_events of WhatsApp)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id     UUID REFERENCES public.audience_contacts(id) ON DELETE SET NULL,
  enrollment_id  UUID REFERENCES public.email_sequence_enrollments(id) ON DELETE SET NULL,
  direction      TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  event_type     TEXT NOT NULL
                   CHECK (event_type IN ('sent', 'delivered', 'read', 'failed', 'received', 'opted_out')),
  -- Meta's message id (wamid...). Used as the idempotency key for status
  -- webhooks, which Meta retries.
  wa_message_id  TEXT,
  phone          TEXT,
  body           TEXT,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_project_time
  ON public.whatsapp_events(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_contact
  ON public.whatsapp_events(contact_id)
  WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_events_message_event
  ON public.whatsapp_events(wa_message_id, event_type)
  WHERE wa_message_id IS NOT NULL;

ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_whatsapp_events" ON public.whatsapp_events;
CREATE POLICY "project_owner_whatsapp_events" ON public.whatsapp_events
  FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );
-- Writes come only from the service role (webhook route and scheduler
-- handler), so no INSERT policy for authenticated users.
