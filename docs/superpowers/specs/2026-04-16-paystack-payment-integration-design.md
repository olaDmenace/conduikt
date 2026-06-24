# Paystack Payment Integration

**Date:** 2026-04-16
**Status:** Approved
**Replaces:** Lemon Squeezy (account never approved, code present but unused in production)

---

## Goal

Replace the Lemon Squeezy payment integration with Paystack subscriptions using the inline popup checkout. Keep the architecture provider-agnostic so Flutterwave can be added later as a secondary option.

## Tier Structure (unchanged)

| Tier | Price | Generations/mo | Projects |
|------|-------|----------------|----------|
| Free | $0 | 5 | 1 |
| Pro | $49 | 250 | 5 |
| Growth | $99 | 500 | 15 |
| Agency | $249 | Unlimited | Unlimited |

Plans must be created in the Paystack dashboard first. Each plan produces a plan code (e.g., `PLN_xxxxx`) that maps to a tier.

## Architecture

### Checkout Flow

1. User clicks "Upgrade" on `/settings/billing`
2. Frontend calls `POST /api/billing/initialize` with `{ planKey: "pro" | "growth" | "agency" }`
3. Server validates user, resolves Paystack plan code, calls Paystack `POST /transaction/initialize` with `plan` param, returns `access_code`
4. Frontend opens Paystack Popup with the `access_code`
5. User completes payment in-modal (card, Google Pay, Apple Pay, bank transfer)
6. Popup `onSuccess` callback fires; frontend starts polling `/api/profile` for plan change
7. Meanwhile, Paystack sends webhook to `/api/webhooks/paystack`
8. Webhook handler verifies HMAC-SHA512 signature, processes event, updates `profiles` table
9. Frontend poll detects plan change, shows success banner

### Webhook Events

| Paystack Event | Handler Action |
|----------------|----------------|
| `subscription.create` | Update `profiles`: set `plan`, `payment_provider`, `payment_customer_id`, `payment_subscription_id`, `payment_plan_code` |
| `charge.success` (recurring) | Reset `generation_count` to 0, update `generation_reset_at`. Only for recurring charges (check `channel === "recurring"` or presence of `subscription_code`) |
| `subscription.disable` | Downgrade to free, clear payment columns |
| `subscription.not_renew` | Downgrade to free, clear payment columns |
| `invoice.payment_failed` | Create notification for user warning of payment failure. Keep plan active (grace). |

### Signature Verification

Paystack signs webhooks with HMAC-SHA512 using the secret key. Verify via:
```
hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')
compare hash === request.headers['x-paystack-signature']
```

## Database Changes

### Migration: Drop Lemon Squeezy, Add Provider-Agnostic Columns

Drop columns from `profiles`:
- `lemon_squeezy_customer_id`
- `lemon_squeezy_subscription_id`
- `lemon_squeezy_variant_id`

Add columns to `profiles`:
- `payment_provider` (text, nullable) — `"paystack"` or `"flutterwave"`
- `payment_customer_id` (text, nullable) — Paystack customer code
- `payment_subscription_id` (text, nullable) — Paystack subscription code
- `payment_authorization` (text, nullable) — Paystack authorization code for recurring
- `payment_plan_code` (text, nullable) — The plan code on the provider side

All nullable because free-tier users have no payment info.

## Files

### New Files

1. **`src/app/api/webhooks/paystack/route.ts`** — Webhook handler
   - HMAC-SHA512 signature verification
   - Event routing: `subscription.create`, `charge.success`, `subscription.disable`, `subscription.not_renew`, `invoice.payment_failed`
   - Uses service client (no user auth context)
   - Sends plan upgrade email on new subscription via `sendPlanUpgradeEmail`
   - Creates notification on payment failure

2. **`src/app/api/billing/initialize/route.ts`** — Initialize transaction
   - Authenticated (requires logged-in user)
   - Accepts `{ planKey: "pro" | "growth" | "agency" }`
   - Resolves Paystack plan code from env vars
   - Calls Paystack `POST https://api.paystack.co/transaction/initialize` with:
     - `email`: user's email
     - `plan`: Paystack plan code
     - `metadata`: `{ user_id, plan_key }`
     - `callback_url`: `{APP_URL}/settings/billing?payment=success`
   - Returns `{ access_code, authorization_url, reference }` to frontend

3. **`supabase/migrations/2026XXXX_payment_provider_columns.sql`** — Schema migration

### Modified Files

4. **`src/app/(dashboard)/settings/billing/page.tsx`** — Replace Lemon Squeezy checkout
   - Remove Lemon Squeezy checkout URL generation
   - Remove `lemon_squeezy_customer_id` / portal URL references
   - Add Paystack Popup integration via `@paystack/inline-js`
   - On "Upgrade" click: call `/api/billing/initialize`, then open popup with returned `access_code`
   - Keep existing: plan grid, usage bar, success/verifying banners, polling logic

5. **`src/lib/plans.ts`** — Add Paystack plan code resolver
   - Add `PAYSTACK_PLAN_CODES` mapping: reads `PAYSTACK_PLAN_PRO`, `PAYSTACK_PLAN_GROWTH`, `PAYSTACK_PLAN_AGENCY` from env
   - Add `getPaystackPlanCode(tier: PlanTier): string | null` helper
   - Add reverse mapping `paystackPlanToTier(planCode: string): PlanTier`

6. **`src/app/(marketing)/pricing/page.tsx`** — Wire CTA buttons
   - "Get Started Free" → `/signup`
   - Paid tiers → `/signup` (for new users) or `/settings/billing` (for logged-in users)

### Deleted Files

7. **`src/app/api/webhooks/lemonsqueezy/route.ts`** — No longer needed

## Environment Variables

### Required (server)
- `PAYSTACK_SECRET_KEY` — From Paystack dashboard (starts with `sk_live_` or `sk_test_`). Used for both API calls and webhook HMAC-SHA512 signature verification (no separate webhook secret needed).

### Required (client)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — Public key for the popup SDK (starts with `pk_live_` or `pk_test_`)

### Plan codes (server)
- `PAYSTACK_PLAN_PRO` — Plan code for Pro tier
- `PAYSTACK_PLAN_GROWTH` — Plan code for Growth tier
- `PAYSTACK_PLAN_AGENCY` — Plan code for Agency tier

These are created in the Paystack dashboard: Settings > Plans > Create Plan for each tier.

## NPM Dependencies

- Add: `@paystack/inline-js` (Paystack popup SDK for frontend)

## What Stays Unchanged

- `plans.ts` core logic (tiers, limits, gating functions)
- `sendPlanUpgradeEmail` in `lib/email/index.ts`
- Billing page layout, design system, animations
- Profile polling pattern after payment
- `createNotification` for payment failure alerts
- All agent gating, generation counting, project limits

## Future: Adding Flutterwave

When Flutterwave is approved, the same `payment_*` columns work. Add:
- `src/app/api/webhooks/flutterwave/route.ts`
- `src/app/api/billing/initialize-flutterwave/route.ts` (or extend the existing one with a `provider` param)
- Update billing page to offer provider choice or auto-select based on user region
- Set `payment_provider = "flutterwave"` on those profiles

No schema changes needed.
