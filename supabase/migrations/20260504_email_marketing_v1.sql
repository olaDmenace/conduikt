-- Email Marketing V1 — multi-tenant Resend Audiences + Broadcasts.
--
-- Adds 5 new tables (audiences, audience_contacts, broadcasts, email_events,
-- verified_domains) plus email-usage tracking columns on profiles.
--
-- All user-facing tables are RLS-scoped to project ownership; email_events
-- inherit access via the parent broadcast. The /unsubscribe path runs under
-- the service-role client (no RLS) since it must work without a session.
--
-- Resend integration: each row in `audiences` mirrors a Resend Audience;
-- each `audience_contacts` row mirrors a Resend Contact; each `broadcasts`
-- row mirrors a Resend Broadcast. The resend_*_id columns are nullable
-- only at insert-time (filled in by the API call). `email_events` records
-- delivered/opened/clicked/bounced/complained/unsubscribed events from
-- the Resend webhook with idempotency keyed on resend_event_id.

-- =============================================================================
-- Audiences (per-project mailing lists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audiences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  resend_audience_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audiences_project ON public.audiences(project_id);
CREATE INDEX IF NOT EXISTS idx_audiences_user    ON public.audiences(user_id);

ALTER TABLE public.audiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_audiences" ON public.audiences;
CREATE POLICY "project_owner_audiences" ON public.audiences
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- =============================================================================
-- Contacts (per-audience subscribers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audience_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id         UUID NOT NULL REFERENCES public.audiences(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  first_name          TEXT,
  last_name           TEXT,
  custom_fields       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'subscribed'
                        CHECK (status IN ('subscribed','unsubscribed','bounced','complained')),
  resend_contact_id   TEXT,
  -- per-contact token used in the unsubscribe URL. Doesn't need to be a uuid
  -- but using gen_random_uuid() avoids a separate generator + is unique.
  unsubscribe_token   TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  suppression_reason  TEXT, -- 'bounce' | 'complaint' | 'manual'
  subscribed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A given email appears at most once per audience.
  CONSTRAINT audience_contacts_audience_email_unique UNIQUE (audience_id, email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audience_contacts_unsub_token
  ON public.audience_contacts(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_audience_contacts_audience_status
  ON public.audience_contacts(audience_id, status);

ALTER TABLE public.audience_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_contacts" ON public.audience_contacts;
CREATE POLICY "project_owner_contacts" ON public.audience_contacts
  FOR ALL
  USING (
    audience_id IN (
      SELECT a.id FROM public.audiences a
      JOIN public.projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    audience_id IN (
      SELECT a.id FROM public.audiences a
      JOIN public.projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Broadcasts (one-shot campaigns to an audience)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id          UUID NOT NULL REFERENCES public.audiences(id) ON DELETE CASCADE,
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject              TEXT NOT NULL,
  html_body            TEXT NOT NULL,
  text_body            TEXT, -- optional plain-text alternative
  from_name            TEXT NOT NULL,
  from_email           TEXT NOT NULL, -- must be on a verified domain
  reply_to             TEXT,
  scheduled_for        TIMESTAMPTZ,   -- null = draft / send-now
  sent_at              TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  resend_broadcast_id  TEXT,
  error_message        TEXT,
  -- Aggregate counts updated as Resend webhooks arrive.
  -- Shape: {sent, delivered, opened, clicked, bounced, complained, unsubscribed}
  totals               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_audience       ON public.broadcasts(audience_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_project        ON public.broadcasts(project_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_user           ON public.broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status_sched   ON public.broadcasts(status, scheduled_for);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_broadcasts" ON public.broadcasts;
CREATE POLICY "project_owner_broadcasts" ON public.broadcasts
  FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- =============================================================================
-- Email events (delivered/opened/clicked/bounced/complained/unsubscribed)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id       UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  contact_id         UUID REFERENCES public.audience_contacts(id) ON DELETE SET NULL,
  event_type         TEXT NOT NULL
                       CHECK (event_type IN ('delivered','opened','clicked','bounced','complained','unsubscribed','failed')),
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Resend's event ID — used as idempotency key so webhook retries don't duplicate.
  resend_event_id    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_broadcast_type
  ON public.email_events(broadcast_id, event_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_resend_event
  ON public.email_events(resend_event_id)
  WHERE resend_event_id IS NOT NULL;

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_owner_email_events" ON public.email_events;
CREATE POLICY "project_owner_email_events" ON public.email_events
  FOR SELECT
  USING (
    broadcast_id IN (
      SELECT b.id FROM public.broadcasts b
      JOIN public.projects p ON b.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Verified domains (Pro+ feature — users send from their own domain)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.verified_domains (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain             TEXT NOT NULL,
  resend_domain_id   TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','verified','failed')),
  -- Array of {name, type, value, status} for SPF/DKIM/DMARC records.
  dns_records        JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One user can't claim the same domain twice.
  CONSTRAINT verified_domains_user_domain_unique UNIQUE (user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_verified_domains_user ON public.verified_domains(user_id);

ALTER TABLE public.verified_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_verified_domains" ON public.verified_domains;
CREATE POLICY "user_owns_verified_domains" ON public.verified_domains
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- Email usage tracking on profiles (for plan-limit enforcement)
-- =============================================================================
-- Mirrors the existing generation_count / generation_reset_at pattern used
-- for AI generation gating. Reset monthly; incremented per email sent on a
-- broadcast send. Plan limits live in src/lib/plans/email-limits.ts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_usage_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_usage_reset_at TIMESTAMPTZ;

-- Atomic increment helper, mirroring increment_generation_count.
CREATE OR REPLACE FUNCTION public.increment_email_usage(user_id_param UUID, by_count INTEGER)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.profiles
     SET email_usage_count = COALESCE(email_usage_count, 0) + by_count
   WHERE id = user_id_param;
$$;

-- =============================================================================
-- updated_at triggers
-- =============================================================================

DO $$ BEGIN
  CREATE TRIGGER trg_audiences_updated_at
    BEFORE UPDATE ON public.audiences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_audience_contacts_updated_at
    BEFORE UPDATE ON public.audience_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_broadcasts_updated_at
    BEFORE UPDATE ON public.broadcasts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_verified_domains_updated_at
    BEFORE UPDATE ON public.verified_domains
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
