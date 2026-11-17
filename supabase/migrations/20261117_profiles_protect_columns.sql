-- Close three policy gaps found in the 17 Nov 2026 schema snapshot
-- (docs/db/schema-snapshot-2026-11-17.md, "Observations worth a second look").
--
-- 1. profiles: "Users can update own profile" had no WITH CHECK and the table
--    keeps Supabase's default grants, so a signed-in user could set their own
--    role, plan, quota counters or payment columns from the browser. A BEFORE
--    UPDATE trigger now rejects changes to those columns unless the write runs
--    as something other than the PostgREST client roles. SECURITY DEFINER
--    functions (increment_generation_count, increment_email_usage) execute as
--    their owner, so quota counting from a user session keeps working; the
--    service-role client, webhooks, Inngest and migrations are unaffected.
-- 2. notifications: "Service can insert notifications" allowed any client to
--    insert rows for any user. Inserts from a user session are now limited to
--    the caller's own user_id (the service role bypasses RLS as before).
-- 3. n8n_content_state: "Service role full access" was FOR ALL TO public
--    USING (true). The n8n workflow uses the service key (bypasses RLS), so
--    the policy is narrowed to service_role so the table is service-role only.
--
-- Idempotent: CREATE OR REPLACE / DROP TRIGGER IF EXISTS / ALTER POLICY throughout.

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PostgREST runs client requests as the "authenticated" or "anon" role.
  -- Everything else (service_role, SECURITY DEFINER functions executing as
  -- their owner, the SQL editor, migrations) may change any column.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.generation_count IS DISTINCT FROM OLD.generation_count
     OR NEW.generation_reset_at IS DISTINCT FROM OLD.generation_reset_at
     OR NEW.email_usage_count IS DISTINCT FROM OLD.email_usage_count
     OR NEW.email_usage_reset_at IS DISTINCT FROM OLD.email_usage_reset_at
     OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
     OR NEW.payment_customer_id IS DISTINCT FROM OLD.payment_customer_id
     OR NEW.payment_subscription_id IS DISTINCT FROM OLD.payment_subscription_id
     OR NEW.payment_authorization IS DISTINCT FROM OLD.payment_authorization
     OR NEW.payment_plan_code IS DISTINCT FROM OLD.payment_plan_code
     OR NEW.referred_via IS DISTINCT FROM OLD.referred_via
     OR NEW.referred_at IS DISTINCT FROM OLD.referred_at
  THEN
    RAISE EXCEPTION 'profiles: this column can only be changed by the server'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns ON public.profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- Policies are altered in place (no drop/recreate) so the change is purely
-- additive on a live database.
ALTER POLICY "Users can update own profile" ON public.profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- notifications: a user session may only insert rows for itself.
ALTER POLICY "Service can insert notifications" ON public.notifications
  TO authenticated WITH CHECK (user_id = auth.uid());

-- n8n_content_state: service role only (the n8n workflow uses the service key).
ALTER POLICY "Service role full access" ON public.n8n_content_state TO service_role;
