-- Lead capture forms — embeddable forms that drop visitors into a
-- project's audience and (optionally) trigger a sequence enrollment.
--
-- Usage:
--   <div data-conduikt-form="<form_id>"></div>
--   <script src="https://conduikt.com/embed/form.js"></script>
--
-- The submit endpoint (/api/forms/[formId]/submit) is unauthenticated —
-- the form's existence + is_active flag is the credential. RLS only
-- applies to the owner CRUD surface; service-role + the form_id is what
-- the public path uses.

CREATE TABLE IF NOT EXISTS public.lead_forms (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience_id        UUID NOT NULL REFERENCES public.audiences(id) ON DELETE CASCADE,
  -- Optional: if set, every successful submission auto-enrolls the new
  -- contact in this sequence (step 1 fires after step.delay_hours).
  sequence_id        UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  -- Fields config — array of { name, label, required, type } objects.
  -- V1 hard-codes email + optional first_name/last_name; the schema
  -- allows arbitrary fields so future versions can extend without a
  -- migration.
  fields             JSONB NOT NULL DEFAULT
    '[{"name":"email","label":"Email address","required":true,"type":"email"},{"name":"first_name","label":"First name","required":false,"type":"text"}]'::jsonb,
  -- Where to send the visitor after a successful submit. Null = render
  -- the embed's built-in "Thanks!" message instead.
  redirect_url       TEXT,
  -- Optional headline + button copy shown by the embed JS.
  headline           TEXT,
  submit_label       TEXT NOT NULL DEFAULT 'Subscribe',
  thank_you_message  TEXT NOT NULL DEFAULT 'Thanks for subscribing! Check your inbox.',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Counter for analytics — atomically bumped per successful submit.
  submission_count   INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_forms_project ON public.lead_forms(project_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_user    ON public.lead_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_audience ON public.lead_forms(audience_id);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_lead_forms" ON public.lead_forms;
CREATE POLICY "user_owns_lead_forms" ON public.lead_forms
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER trg_lead_forms_updated_at
    BEFORE UPDATE ON public.lead_forms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Atomic counter bump used by the public submit endpoint.
CREATE OR REPLACE FUNCTION public.increment_form_submission(form_id_param UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.lead_forms
     SET submission_count = COALESCE(submission_count, 0) + 1
   WHERE id = form_id_param;
$$;
