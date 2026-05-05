-- ONE-OFF data migration (not a schema change):
--
-- 1. Promote a saved-draft welcome sequence asset (which only has the
--    AI's raw JSON output) into actual email_sequences +
--    email_sequence_steps + per-step asset rows. The standard
--    "Save & Schedule Drip" path on the dashboard does this, but the
--    user clicked "Save as Draft" instead, so we replicate the
--    promotion logic here in plpgsql.
--
-- 2. Wire app_config.welcome_sequence_id + welcome_audience_id so the
--    handle_user_onboarding() trigger (added in the previous migration)
--    starts firing for new signups.
--
-- 3. Backfill every existing auth.users row (except the audience owner)
--    into the welcome drip — upsert the contact, create an enrollment,
--    enqueue step 1.
--
-- IDs hardcoded for this single deployment. Re-running is safe but
-- pointless: the asset is archived after promotion, the config keys
-- get overwritten with the same values, and the contact/enrollment
-- inserts are idempotent (ON CONFLICT DO NOTHING/UPDATE).

DO $cmd$
DECLARE
  _project_id        UUID := '10f85f55-d82d-453a-9b51-ef95ba27155f';
  _audience_id       UUID := '58e7756b-e96a-4789-b12d-57f9bd94115a';
  _audience_owner_id UUID := 'e2bb2edd-6d6c-4288-a386-145151c264ba';
  _asset_id          UUID := '8fdbf160-6510-4cef-a39e-c76ec1a198be';
  _raw               TEXT;
  _parsed            JSONB;
  _seq_id            UUID;
  _email             JSONB;
  _step_asset_id     UUID;
  _first_step_order  INT;
  _first_step_delay  INT;
  _user              RECORD;
  _contact_id        UUID;
  _enrollment_id     UUID;
  _enrolled_count    INT := 0;
BEGIN
  -- Skip if the source asset is gone or already promoted (archived).
  SELECT content->>'raw' INTO _raw FROM assets WHERE id = _asset_id AND status != 'archived';
  IF _raw IS NULL THEN
    RAISE NOTICE 'promote_welcome: asset already promoted or missing, skipping';
    RETURN;
  END IF;

  -- Strip markdown code fences (the AI sometimes wraps in ```json ... ```)
  _raw := regexp_replace(_raw, '^\s*```(?:json)?\s*\n?', '');
  _raw := regexp_replace(_raw, '\n?\s*```\s*$', '');
  _parsed := _raw::jsonb;

  INSERT INTO email_sequences (project_id, name, type, trigger_event, status)
  VALUES (
    _project_id,
    _parsed->>'sequence_name',
    COALESCE(_parsed->>'type', 'onboarding'),
    _parsed->>'trigger',
    'draft'
  )
  RETURNING id INTO _seq_id;

  FOR _email IN SELECT * FROM jsonb_array_elements(_parsed->'emails')
  LOOP
    INSERT INTO assets (project_id, type, channel, title, content, status)
    VALUES (
      _project_id, 'email', 'email',
      LEFT(_email->>'subject_line', 200),
      jsonb_build_object(
        'subject',      _email->>'subject_line',
        'preview_text', _email->>'preview_text',
        'body_html',    _email->>'body_html',
        'html',         _email->>'body_html',
        'cta_text',     _email->>'cta_text',
        'cta_url',      _email->>'cta_url',
        'goal',         _email->>'goal'
      ),
      'draft'
    )
    RETURNING id INTO _step_asset_id;

    INSERT INTO email_sequence_steps (
      sequence_id, step_order, delay_hours, subject_line, preview_text, asset_id
    ) VALUES (
      _seq_id,
      (_email->>'step')::int,
      (_email->>'delay_hours')::int,
      _email->>'subject_line',
      _email->>'preview_text',
      _step_asset_id
    );
  END LOOP;

  UPDATE assets SET status = 'archived' WHERE id = _asset_id;

  SELECT step_order, delay_hours
  INTO _first_step_order, _first_step_delay
  FROM email_sequence_steps
  WHERE sequence_id = _seq_id
  ORDER BY step_order ASC LIMIT 1;

  RAISE NOTICE 'Sequence promoted: %', _seq_id;

  -- Wire the auth-trigger config so new signups start receiving this drip.
  UPDATE app_config SET value = to_jsonb(_seq_id::text)
  WHERE key = 'welcome_sequence_id';
  UPDATE app_config SET value = to_jsonb(_audience_id::text)
  WHERE key = 'welcome_audience_id';

  -- Backfill every existing user (except the audience owner) into the drip.
  FOR _user IN
    SELECT id, email FROM auth.users
    WHERE email IS NOT NULL AND email != '' AND id != _audience_owner_id
  LOOP
    INSERT INTO audience_contacts (audience_id, email, status)
    VALUES (_audience_id, _user.email, 'subscribed')
    ON CONFLICT (audience_id, email) DO UPDATE
      SET status = 'subscribed',
          unsubscribed_at = NULL,
          suppression_reason = NULL
    RETURNING id INTO _contact_id;

    INSERT INTO email_sequence_enrollments (user_id, sequence_id, contact_id, audience_id)
    VALUES (_audience_owner_id, _seq_id, _contact_id, _audience_id)
    ON CONFLICT (sequence_id, contact_id) DO NOTHING
    RETURNING id INTO _enrollment_id;

    IF _enrollment_id IS NOT NULL THEN
      -- The unique index on scheduled_executions.idempotency_key is
      -- partial (`WHERE idempotency_key IS NOT NULL`); ON CONFLICT
      -- needs the matching predicate to use it.
      INSERT INTO scheduled_executions (
        user_id, execution_type, payload, scheduled_for,
        idempotency_key, parent_id, parent_type
      ) VALUES (
        _audience_owner_id,
        'email_sequence_step',
        jsonb_build_object(
          'enrollmentId', _enrollment_id::text,
          'stepOrder',    _first_step_order
        ),
        NOW() + (_first_step_delay || ' hours')::interval,
        'seq-step:' || _enrollment_id::text || ':' || _first_step_order::text,
        _enrollment_id,
        'email_sequence_enrollment'
      )
      ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
      _enrolled_count := _enrolled_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfilled % existing users into welcome drip', _enrolled_count;
END
$cmd$;
