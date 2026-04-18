-- Pre-launch data reset (2026-04-18, Saturday before Monday launch)
--
-- WHAT THIS DOES:
--   1. Zeroes all financial/referral data: earnings, payouts, clicks, conversions
--   2. Unlinks referral attribution on every profile (referred_via, referred_at)
--   3. Resets AI usage counters on every profile (generation_count, generation_reset_at)
--   4. Wipes ai_generations history
--
-- WHAT IT DOES NOT TOUCH:
--   - referral_links (owners keep their codes)
--   - profiles.plan, payment_customer_id, payment_subscription_id (billing stays intact)
--   - projects, campaigns, audits, assets, etc. (user content is preserved)
--   - auth.users (handled separately by delete-accounts.mjs)
--
-- HOW TO USE (Supabase SQL Editor):
--   1. Dry-run first: paste everything between BEGIN and COMMIT, replace COMMIT with ROLLBACK,
--      verify the row counts look right.
--   2. Then run the full file (BEGIN ... COMMIT) to commit the reset.

BEGIN;

-- Referral financials + tracking
TRUNCATE TABLE referral_earnings RESTART IDENTITY CASCADE;
TRUNCATE TABLE referral_payouts RESTART IDENTITY CASCADE;
TRUNCATE TABLE referral_conversions RESTART IDENTITY CASCADE;
TRUNCATE TABLE referral_clicks RESTART IDENTITY CASCADE;

-- Clear referral attribution from every profile
UPDATE profiles
SET referred_via = NULL,
    referred_at = NULL
WHERE referred_via IS NOT NULL OR referred_at IS NOT NULL;

-- Reset AI usage counters + history
UPDATE profiles
SET generation_count = 0,
    generation_reset_at = now();

TRUNCATE TABLE ai_generations RESTART IDENTITY CASCADE;

COMMIT;
