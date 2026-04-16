-- Drop Lemon Squeezy columns (never used in production)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS lemon_squeezy_customer_id,
  DROP COLUMN IF EXISTS lemon_squeezy_subscription_id,
  DROP COLUMN IF EXISTS lemon_squeezy_variant_id;

-- Add provider-agnostic payment columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_customer_id text,
  ADD COLUMN IF NOT EXISTS payment_subscription_id text,
  ADD COLUMN IF NOT EXISTS payment_authorization text,
  ADD COLUMN IF NOT EXISTS payment_plan_code text;

-- Index for webhook lookups by customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_payment_customer
  ON profiles (payment_customer_id)
  WHERE payment_customer_id IS NOT NULL;
