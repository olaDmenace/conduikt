-- Business details, the name/address/phone check, and the leads pipeline
-- (audit §5.2 wedge, §5.4 #5, Phase 5).
--
-- projects gains the plain contact details a local business needs on
-- every page (phone, address, city), the two links other workstreams
-- read (booking_url for the "Send booking link" message and workstream D;
-- review_url for workstream F), and the last stored name/address/phone
-- report (nap_report + nap_checked_at) so the settings page can show it
-- without re-crawling.
--
-- audience_contacts gains the pipeline columns: which stage a lead is in,
-- when it moved, where it came from, and when it last replied. The lead
-- score is computed on read (src/lib/leads/score.ts), never stored.
--
-- No new tables: RLS on projects and audience_contacts already scopes
-- these columns to the project owner.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS address_line   TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS booking_url    TEXT,
  ADD COLUMN IF NOT EXISTS review_url     TEXT,
  ADD COLUMN IF NOT EXISTS nap_report     JSONB,
  ADD COLUMN IF NOT EXISTS nap_checked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.phone IS
  'The number customers call or message, as the owner typed it. Compared against the website by src/lib/local/nap-check.ts.';
COMMENT ON COLUMN public.projects.address_line IS
  'Street and building, e.g. "12 Admiralty Way". City lives in projects.city.';
COMMENT ON COLUMN public.projects.booking_url IS
  'Where customers book: Calendly, WhatsApp click-to-chat, etc. Read by the leads page ("Send booking link") and workstream D.';
COMMENT ON COLUMN public.projects.review_url IS
  'Where customers leave a review, e.g. the Google Business profile review link. Read by workstream F.';
COMMENT ON COLUMN public.projects.nap_report IS
  'Last name/address/phone consistency report (NapReport in src/lib/local/nap-check.ts). Replaced on every run.';

ALTER TABLE public.audience_contacts
  ADD COLUMN IF NOT EXISTS pipeline_stage   TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_source      TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_at    TIMESTAMPTZ;

-- The stage list is mirrored in src/lib/leads/stages.ts; change both.
ALTER TABLE public.audience_contacts
  DROP CONSTRAINT IF EXISTS audience_contacts_pipeline_stage_check;
ALTER TABLE public.audience_contacts
  ADD CONSTRAINT audience_contacts_pipeline_stage_check
  CHECK (pipeline_stage IN ('new', 'contacted', 'qualified', 'won', 'lost'));

COMMENT ON COLUMN public.audience_contacts.pipeline_stage IS
  'Where this lead is in the pipeline. Moved by PATCH /api/projects/[id]/leads/[contactId].';
COMMENT ON COLUMN public.audience_contacts.lead_source IS
  'Where the contact came from: form, import, manual, whatsapp, ... Null for rows created before this column existed. "form" earns +20 on the lead score.';
COMMENT ON COLUMN public.audience_contacts.last_reply_at IS
  'When the contact last wrote back (WhatsApp inbound, email reply). Set by the inbound handlers; +25 on the lead score.';

CREATE INDEX IF NOT EXISTS idx_audience_contacts_audience_stage
  ON public.audience_contacts(audience_id, pipeline_stage);
