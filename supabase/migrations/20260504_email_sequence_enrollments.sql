-- Email sequence enrollments — one row per (sequence, contact) pair.
--
-- Tracks each subscriber's progress through a multi-step email sequence:
-- which step they last received, whether the run is still active or has
-- been cancelled (e.g., contact unsubscribed mid-sequence), and when they
-- finished.
--
-- The actual scheduling of "send step N" lives in scheduled_executions
-- with execution_type='email_sequence_step' and payload pointing back at
-- this enrollment.

CREATE TABLE IF NOT EXISTS public.email_sequence_enrollments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id         UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id          UUID NOT NULL REFERENCES public.audience_contacts(id) ON DELETE CASCADE,
  audience_id         UUID NOT NULL REFERENCES public.audiences(id) ON DELETE CASCADE,
  -- step_order of the most recently sent step. 0 = enrolled but no step
  -- has been sent yet. Bumped by the handler after each successful send.
  current_step_order  INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','completed','cancelled')),
  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_step_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  -- Why the enrollment ended early (if applicable). 'unsubscribed',
  -- 'bounced', 'manual', etc.
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One enrollment per contact per sequence — re-enrolling the same
  -- contact in the same sequence is a no-op.
  CONSTRAINT email_sequence_enrollments_contact_seq_unique
    UNIQUE (sequence_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_sequence
  ON public.email_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_user_status
  ON public.email_sequence_enrollments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_contact
  ON public.email_sequence_enrollments(contact_id);

ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_seq_enrollments" ON public.email_sequence_enrollments;
CREATE POLICY "user_owns_seq_enrollments" ON public.email_sequence_enrollments
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER trg_seq_enrollments_updated_at
    BEFORE UPDATE ON public.email_sequence_enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
