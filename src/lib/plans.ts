// Single source of truth for plan tiers, limits, and gating checks.
// Keep in sync with docs/conduikt-pricing-strategy-v2.md.

// "local" is the naira tier for one local business (decision D3): it sits
// between Free and Pro in rank, is priced in NGN, and only appears on the
// pricing and billing pages once a LOCAL plan id is set with either
// provider (see isLocalPlanEnabled).
export type PlanTier = "free" | "local" | "pro" | "growth" | "agency";

// Rank decides what a plan unlocks (isPlanAtLeast). Local sits between
// Free and Pro: it gets everything Free gets and less than Pro.
export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  local: 1,
  pro: 2,
  growth: 3,
  agency: 4,
};

// The upgrade ladder: the plans everyone can buy from Billing, cheapest
// first. Local is not on it. It is sold only from the pricing page, in
// naira, to one local business; nobody is "upgraded to Local", and a
// Free user who hits a limit is offered Pro whether or not Local exists.
// Use nextUpgradeTier() rather than indexing this array by rank.
export const PLAN_ORDER: PlanTier[] = ["free", "pro", "growth", "agency"];

export type PlanCurrency = "USD" | "NGN";

// Monthly generation limits per tier. Infinity for unlimited tiers.
export const GENERATION_LIMITS: Record<PlanTier, number> = {
  free: 5,
  local: 125,
  pro: 250,
  growth: 500,
  agency: Number.POSITIVE_INFINITY,
};

// Monthly project cap per tier.
export const PROJECT_LIMITS: Record<PlanTier, number> = {
  free: 1,
  local: 1,
  pro: 5,
  growth: 15,
  agency: Number.POSITIVE_INFINITY,
};

// Team seat cap per tier (includes the owner).
// Free/Pro are single-seat: no teammates. Growth adds 2 teammates. Agency adds 9.
export const SEAT_LIMITS: Record<PlanTier, number> = {
  free: 1,
  local: 1,
  pro: 1,
  growth: 3,
  agency: 10,
};

export function getSeatLimit(plan: PlanTier): number {
  return SEAT_LIMITS[plan];
}

// Email marketing per-tier limits. Resend bills Conduikt for every email
// sent (transactional + marketing combined), so these limits cap our
// liability on the free tier and shape the upgrade ladder. See
// docs/conduikt-pricing-strategy-v2.md for the rationale.
export interface EmailLimits {
  audiences: number;          // max audiences per user
  contactsPerAudience: number; // max contacts in a single audience
  emailsPerMonth: number;      // marketing emails this user can send per month
  customDomain: boolean;       // can verify their own sending domain
  sequences: number;           // max email sequences per user (across all projects)
}

export const EMAIL_LIMITS: Record<PlanTier, EmailLimits> = {
  free: {
    audiences: 1,
    contactsPerAudience: 100,
    emailsPerMonth: 50,
    customDomain: false,
    sequences: 1,
  },
  local: {
    audiences: 1,
    contactsPerAudience: 500,
    emailsPerMonth: 2_000,
    customDomain: false,
    sequences: 3,
  },
  pro: {
    audiences: 3,
    contactsPerAudience: 2_000,
    emailsPerMonth: 10_000,
    customDomain: true,
    sequences: 10,
  },
  growth: {
    audiences: 10,
    contactsPerAudience: 10_000,
    emailsPerMonth: 50_000,
    customDomain: true,
    sequences: 50,
  },
  agency: {
    audiences: Number.POSITIVE_INFINITY,
    contactsPerAudience: 25_000,
    emailsPerMonth: 200_000,
    customDomain: true,
    sequences: Number.POSITIVE_INFINITY,
  },
};

export function getEmailLimits(plan: PlanTier): EmailLimits {
  return EMAIL_LIMITS[plan];
}

export function canVerifyCustomDomain(plan: PlanTier): boolean {
  return EMAIL_LIMITS[plan].customDomain;
}

export function hasEmailQuotaAvailable(plan: PlanTier, used: number): boolean {
  const limit = EMAIL_LIMITS[plan].emailsPerMonth;
  if (isUnlimited(limit)) return true;
  return used < limit;
}

export function canInviteTeammates(plan: PlanTier): boolean {
  return SEAT_LIMITS[plan] > 1;
}

// Human-readable pricing used on landing + pricing pages, and the amount
// and currency the checkout charges. `price` is in the tier's own
// currency: dollars for the USD tiers, naira for Local.
export const PLAN_PRICING: Record<PlanTier, { price: number; label: string; currency: PlanCurrency }> = {
  free: { price: 0, label: "$0", currency: "USD" },
  local: { price: 15000, label: "₦15,000", currency: "NGN" },
  pro: { price: 49, label: "$49", currency: "USD" },
  growth: { price: 99, label: "$99", currency: "USD" },
  agency: { price: 249, label: "$249", currency: "USD" },
};

/** The currency a tier is charged in. */
export function planCurrency(tier: PlanTier): PlanCurrency {
  return PLAN_PRICING[tier].currency;
}

/** What the Local tier includes, in the words the pricing page uses. */
export const LOCAL_PLAN_FEATURES: string[] = [
  "Missing Pages: finds the searches you have no page for and writes them",
  "A hosted page for your business, live in minutes",
  "WhatsApp messages to customers who opted in",
  "Review requests by email or WhatsApp after every job",
  "Leads from your forms, in one list",
  `${GENERATION_LIMITS.local} pieces of content a month`,
  "1 project",
];

/**
 * True once the Local plan can actually be bought: a naira plan exists
 * with either provider. Both charge in the tier's own currency
 * (planCurrency) and both webhooks map their LOCAL plan id back to
 * "local", so whichever provider /api/billing/initialize picks works.
 */
export function isLocalPlanEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.PAYSTACK_PLAN_LOCAL || env.FLUTTERWAVE_PLAN_LOCAL);
}

export function normalizePlan(plan: string | null | undefined): PlanTier {
  if (plan === "local" || plan === "pro" || plan === "growth" || plan === "agency") return plan;
  return "free";
}

export function planRank(plan: PlanTier): number {
  return PLAN_RANK[plan];
}

/**
 * The plan to offer when `plan` runs out of something, or null on the
 * top plan. Local users are offered Pro, the next dollar tier up; the
 * naira tier is never an upgrade target.
 */
export function nextUpgradeTier(plan: PlanTier): PlanTier | null {
  if (plan === "local") return "pro";
  const idx = PLAN_ORDER.indexOf(plan);
  if (idx === -1 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

/**
 * True when `userPlan` is at or above `requiredTier`.
 * e.g. isPlanAtLeast("growth", "pro") → true
 */
export function isPlanAtLeast(userPlan: PlanTier, requiredTier: PlanTier): boolean {
  return planRank(userPlan) >= planRank(requiredTier);
}

export function getGenerationLimit(plan: PlanTier): number {
  return GENERATION_LIMITS[plan];
}

export function getProjectLimit(plan: PlanTier): number {
  return PROJECT_LIMITS[plan];
}

export function isUnlimited(limit: number): boolean {
  return !Number.isFinite(limit);
}

export function hasGenerationsAvailable(plan: PlanTier, used: number): boolean {
  const limit = getGenerationLimit(plan);
  if (isUnlimited(limit)) return true;
  return used < limit;
}

/**
 * Given a user's current plan, returns the next-higher tier they should upgrade
 * to in order to reach the required tier (used for upgrade CTAs).
 */
export function nextTierFor(requiredTier: PlanTier): PlanTier {
  return requiredTier;
}

export function tierLabel(tier: PlanTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// ---------------------------------------------------------------------------
// Paystack plan code mapping
// ---------------------------------------------------------------------------

/**
 * Maps tier keys to Paystack plan codes from env vars.
 * Plan codes are created in the Paystack dashboard (Settings > Plans).
 */
export function getPaystackPlanCode(tier: PlanTier): string | null {
  const map: Record<string, string | undefined> = {
    local: process.env.PAYSTACK_PLAN_LOCAL,
    pro: process.env.PAYSTACK_PLAN_PRO,
    growth: process.env.PAYSTACK_PLAN_GROWTH,
    agency: process.env.PAYSTACK_PLAN_AGENCY,
  };
  return map[tier] ?? null;
}

/**
 * Reverse lookup: given a Paystack plan code, return the tier.
 * Used in webhook handlers to determine which plan the user subscribed to.
 */
export function paystackPlanToTier(planCode: string): PlanTier {
  if (!planCode) return "free";
  if (planCode === process.env.PAYSTACK_PLAN_LOCAL) return "local";
  if (planCode === process.env.PAYSTACK_PLAN_PRO) return "pro";
  if (planCode === process.env.PAYSTACK_PLAN_GROWTH) return "growth";
  if (planCode === process.env.PAYSTACK_PLAN_AGENCY) return "agency";
  return "free";
}

// ---------------------------------------------------------------------------
// Flutterwave plan ID mapping
// ---------------------------------------------------------------------------

/**
 * Maps tier keys to Flutterwave payment plan IDs from env vars.
 * Plan IDs are created in the Flutterwave dashboard (Payments > Payment Plans).
 * Use numeric IDs (e.g. 12345), not the plan name.
 */
export function getFlutterwavePlanId(tier: PlanTier): string | null {
  const map: Record<string, string | undefined> = {
    local: process.env.FLUTTERWAVE_PLAN_LOCAL,
    pro: process.env.FLUTTERWAVE_PLAN_PRO,
    growth: process.env.FLUTTERWAVE_PLAN_GROWTH,
    agency: process.env.FLUTTERWAVE_PLAN_AGENCY,
  };
  return map[tier] ?? null;
}

/**
 * Reverse lookup: given a Flutterwave payment plan ID, return the tier.
 * Used in webhook handlers to determine which plan the user subscribed to.
 */
export function flutterwavePlanToTier(planId: string | number): PlanTier {
  const id = String(planId);
  if (!id) return "free";
  if (id === process.env.FLUTTERWAVE_PLAN_LOCAL) return "local";
  if (id === process.env.FLUTTERWAVE_PLAN_PRO) return "pro";
  if (id === process.env.FLUTTERWAVE_PLAN_GROWTH) return "growth";
  if (id === process.env.FLUTTERWAVE_PLAN_AGENCY) return "agency";
  return "free";
}
