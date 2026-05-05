-- Evergreen onboarding: auto-enrol new Conduikt signups in a welcome
-- email drip.
--
-- When a row is inserted in auth.users (i.e., a user signs up via
-- Supabase Auth) and the admin has configured a welcome sequence +
-- audience in app_config, this trigger:
--   1. Upserts a contact in the configured audience using the new
--      user's email.
--   2. Creates an email_sequence_enrollments row.
--   3. Enqueues step 1 in scheduled_executions for the cron tick to
--      send through the existing email_sequence_step handler.
--
-- The trigger is OPT-IN. Until both app_config keys
-- `welcome_sequence_id` and `welcome_audience_id` hold real UUIDs, the
-- trigger short-circuits and signup proceeds untouched. Setup, after
-- creating a sequence + audience via the dashboard:
--
--   UPDATE app_config SET value = '"<sequence-uuid>"'::jsonb
--   WHERE key = 'welcome_sequence_id';
--
--   UPDATE app_config SET value = '"<audience-uuid>"'::jsonb
--   WHERE key = 'welcome_audience_id';
--
-- To disable temporarily without dropping the trigger, set either to
-- 'null'::jsonb. Errors inside the trigger are caught + logged via
-- RAISE NOTICE so a misconfigured drip never blocks user signup.

INSERT INTO app_config (key, value) VALUES
  ('welcome_sequence_id', 'null'::jsonb),
  ('welcome_audience_id', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_user_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _seq_text          TEXT;
  _audience_text     TEXT;
  _seq_id            UUID;
  _audience_id       UUID;
  _audience_user_id  UUID;
  _first_step_order  INTEGER;
  _first_step_delay  INTEGER;
  _contact_id        UUID;
  _enrollment_id     UUID;
  _scheduled_for     TIMESTAMPTZ;
BEGIN
  -- Read the configured welcome targets out of app_config.
  -- Using `#>> '{}'` strips JSON quotes — a stored "abc-123" comes out
  -- as the bare 'abc-123' string. A jsonb 'null' returns SQL NULL.
  SELECT value #>> '{}' INTO _seq_text
  FROM public.app_config WHERE key = 'welcome_sequence_id';

  SELECT value #>> '{}' INTO _audience_text
  FROM public.app_config WHERE key = 'welcome_audience_id';

  -- Opt-in gate: skip silently if either key is unset.
  IF _seq_text IS NULL OR _seq_text = ''
     OR _audience_text IS NULL OR _audience_text = ''
  THEN
    RETURN NEW;
  END IF;

  _seq_id := _seq_text::UUID;
  _audience_id := _audience_text::UUID;

  -- Audience must still exist (admin might have deleted it after
  -- configuring). Fail closed without breaking signup.
  SELECT user_id INTO _audience_user_id
  FROM public.audiences
  WHERE id = _audience_id;

  IF _audience_user_id IS NULL THEN
    RAISE NOTICE 'handle_user_onboarding: audience % not found, skipping', _audience_id;
    RETURN NEW;
  END IF;

  -- Step 1 = lowest step_order. Skip if the sequence has no steps yet.
  SELECT step_order, delay_hours
  INTO _first_step_order, _first_step_delay
  FROM public.email_sequence_steps
  WHERE sequence_id = _seq_id
  ORDER BY step_order ASC
  LIMIT 1;

  IF _first_step_order IS NULL THEN
    RAISE NOTICE 'handle_user_onboarding: sequence % has no steps, skipping', _seq_id;
    RETURN NEW;
  END IF;

  -- Upsert the contact. ON CONFLICT updates status so a previously
  -- soft-removed contact (e.g., manual unsubscribe before creating the
  -- account) gets reactivated when they create their account. Their
  -- choice to unsubscribe later is preserved by the per-step status
  -- check in the handler.
  INSERT INTO public.audience_contacts (audience_id, email, status)
  VALUES (_audience_id, NEW.email, 'subscribed')
  ON CONFLICT (audience_id, email) DO UPDATE
    SET status = 'subscribed',
        unsubscribed_at = NULL,
        suppression_reason = NULL
  RETURNING id INTO _contact_id;

  -- Create enrollment. Idempotent — re-signing-in with the same email
  -- (rare but possible if account is deleted/recreated) won't create a
  -- duplicate drip.
  INSERT INTO public.email_sequence_enrollments
    (user_id, sequence_id, contact_id, audience_id)
  VALUES
    (_audience_user_id, _seq_id, _contact_id, _audience_id)
  ON CONFLICT (sequence_id, contact_id) DO NOTHING
  RETURNING id INTO _enrollment_id;

  IF _enrollment_id IS NULL THEN
    -- Conflict path — enrollment already exists, no need to enqueue.
    RETURN NEW;
  END IF;

  -- Enqueue step 1. Mirror the shape the TypeScript enqueue helper uses
  -- so the email_sequence_step handler reads it identically.
  _scheduled_for := NOW() + (_first_step_delay || ' hours')::interval;

  INSERT INTO public.scheduled_executions
    (user_id, execution_type, payload, scheduled_for,
     idempotency_key, parent_id, parent_type)
  VALUES
    (_audience_user_id,
     'email_sequence_step',
     jsonb_build_object(
       'enrollmentId', _enrollment_id::text,
       'stepOrder', _first_step_order
     ),
     _scheduled_for,
     'seq-step:' || _enrollment_id::text || ':' || _first_step_order::text,
     _enrollment_id,
     'email_sequence_enrollment')
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
EXCEPTION
  -- Never block account creation because of an onboarding error.
  -- The user can still sign up; the drip just doesn't fire.
  WHEN OTHERS THEN
    RAISE NOTICE 'handle_user_onboarding failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Fire AFTER profile creation. Both triggers live on auth.users insert;
-- Postgres runs them in alphabetical name order (on_auth_user_*),
-- which conveniently puts on_auth_user_created before
-- on_auth_user_onboarding so the profile exists before we touch the
-- audience tables (which RLS-reference the profile).
DROP TRIGGER IF EXISTS on_auth_user_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_onboarding();
