-- Stores human-input values for the X playbook's bracket posts that can't
-- be auto-scraped: {MISTAKE}, {COST}, {LESSON}, {SHIPPED_FEATURE}, {REQUESTER},
-- {CALIB_STAT}, {CD_ONBOARDED}. The /dashboard/x-playbook admin page writes
-- here; the /api/cron/fill-x-bracket route reads here when filling templates.
--
-- ref + field_name uniquely identify a value. Updates are upserts.

CREATE TABLE IF NOT EXISTS public.x_playbook_bracket_inputs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref         text NOT NULL,       -- e.g. 'd5-a-shipped-feedback'
  field_name  text NOT NULL,       -- e.g. 'SHIPPED_FEATURE', 'MISTAKE'
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT x_playbook_bracket_inputs_unique UNIQUE (ref, field_name)
);

CREATE INDEX IF NOT EXISTS x_playbook_bracket_inputs_ref_idx
  ON public.x_playbook_bracket_inputs (ref);

-- RLS: only the playbook owner (user A) can read/write.
ALTER TABLE public.x_playbook_bracket_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY x_playbook_bracket_inputs_owner_all
  ON public.x_playbook_bracket_inputs
  FOR ALL
  USING (auth.uid() = 'e2bb2edd-6d6c-4288-a386-145151c264ba'::uuid)
  WITH CHECK (auth.uid() = 'e2bb2edd-6d6c-4288-a386-145151c264ba'::uuid);
