-- DRAFT — not applied. Move to supabase/migrations/20261117_profiles_protect_columns.sql
-- and apply from there once the lead has reviewed it.
--
-- Why: profiles policy "Users can update own profile" has no WITH CHECK and the
-- table keeps the default grants, so any signed-in user can update their own
-- role, plan, quota counters and payment columns from the browser. See
-- docs/db/schema-snapshot-2026-11-17.md, "Observations worth a second look".
--
-- Approach: a BEFORE UPDATE trigger that rejects changes to the protected
-- columns unless the caller is service_role (webhooks, Inngest and admin
-- routes all write through the service-role client). A trigger is used
-- instead of column REVOKEs so that supabase-js updates from the browser
-- that touch only safe columns (full_name, avatar_url, brand_*,
-- onboarding_completed) keep working unchanged.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  );
BEGIN
  -- Service-role writes (webhooks, Inngest, admin routes) and direct SQL
  -- (no JWT at all, e.g. the SQL editor or migrations) are allowed through.
  IF jwt_role IS NULL OR jwt_role = 'service_role' THEN
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

-- Also give the UPDATE policy a WITH CHECK so a row cannot be re-pointed at
-- another user's id.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
