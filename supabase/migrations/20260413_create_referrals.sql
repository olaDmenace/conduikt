-- Referral link system with revenue sharing and manual payouts
--
-- Flow:
--   1. Admin creates referral_links with a slug + commission config
--   2. /r/{code} public route logs a click and sets an attribution cookie
--   3. On signup, profiles.referred_via is set and referral_conversions row is created
--   4. When user pays, referral_earnings rows are credited
--   5. Admin disburses referral_payouts manually and marks earnings paid

-- ─── referral_links ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  partner_name text NOT NULL,
  partner_email text NOT NULL,
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat')),
  commission_rate numeric(5, 4) DEFAULT 0.2000,
  flat_amount_usd numeric(10, 2),
  active boolean DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_links_code ON referral_links(code);
CREATE INDEX IF NOT EXISTS idx_referral_links_active ON referral_links(active);

-- ─── referral_clicks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid REFERENCES referral_links(id) ON DELETE CASCADE,
  visited_at timestamptz DEFAULT now(),
  ip_hash text,
  user_agent text,
  referer text,
  country text
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_link ON referral_clicks(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_date ON referral_clicks(visited_at DESC);

-- ─── referral_conversions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid REFERENCES referral_links(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_up_at timestamptz DEFAULT now(),
  first_paid_at timestamptz,
  current_plan text DEFAULT 'free',
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_link ON referral_conversions(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_user ON referral_conversions(user_id);

-- ─── referral_earnings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid REFERENCES referral_links(id) ON DELETE SET NULL,
  conversion_id uuid REFERENCES referral_conversions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_source text DEFAULT 'manual',      -- 'stripe' | 'manual'
  payment_reference text,                    -- stripe invoice id etc
  payment_amount_usd numeric(10, 2) NOT NULL,
  commission_usd numeric(10, 2) NOT NULL,
  paid_out boolean DEFAULT false,
  payout_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_link ON referral_earnings(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_paid ON referral_earnings(paid_out);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_payout ON referral_earnings(payout_id);

-- ─── referral_payouts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  partner_email text NOT NULL,
  amount_usd numeric(10, 2) NOT NULL,
  method text,                                -- 'bank' | 'paypal' | 'crypto' | 'other'
  reference text,                             -- external txn id
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_date ON referral_payouts(created_at DESC);

-- Back-reference earnings → payouts (delayed so table exists)
ALTER TABLE referral_earnings
  DROP CONSTRAINT IF EXISTS referral_earnings_payout_id_fkey;
ALTER TABLE referral_earnings
  ADD CONSTRAINT referral_earnings_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES referral_payouts(id) ON DELETE SET NULL;

-- ─── profiles.referred_via ────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_via uuid REFERENCES referral_links(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_via ON profiles(referred_via);

-- ─── RLS ──────────────────────────────────────────────────────────
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

-- All referral tables are admin-only. Writes go through service role
-- from server routes; regular users have no direct access.
DO $$ BEGIN
  CREATE POLICY "Admins can read referral_links"
    ON referral_links FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read referral_clicks"
    ON referral_clicks FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read referral_conversions"
    ON referral_conversions FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read referral_earnings"
    ON referral_earnings FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read referral_payouts"
    ON referral_payouts FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Updated at trigger on referral_links
DO $$ BEGIN
  CREATE TRIGGER update_referral_links_updated_at
    BEFORE UPDATE ON referral_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
