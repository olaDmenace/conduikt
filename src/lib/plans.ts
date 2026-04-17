// Single source of truth for plan tiers, limits, and gating checks.
// Keep in sync with conduikt-pricing-strategy-v2.md.

export type PlanTier = "free" | "pro" | "growth" | "agency";

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "growth", "agency"];

// Monthly generation limits per tier. Infinity for unlimited tiers.
export const GENERATION_LIMITS: Record<PlanTier, number> = {
  free: 5,
  pro: 250,
  growth: 500,
  agency: Number.POSITIVE_INFINITY,
};

// Monthly project cap per tier.
export const PROJECT_LIMITS: Record<PlanTier, number> = {
  free: 1,
  pro: 5,
  growth: 15,
  agency: Number.POSITIVE_INFINITY,
};

// Human-readable pricing used on landing + pricing pages.
export const PLAN_PRICING: Record<PlanTier, { price: number; label: string }> = {
  free: { price: 0, label: "$0" },
  pro: { price: 49, label: "$49" },
  growth: { price: 99, label: "$99" },
  agency: { price: 249, label: "$249" },
};

export function normalizePlan(plan: string | null | undefined): PlanTier {
  if (plan === "pro" || plan === "growth" || plan === "agency") return plan;
  return "free";
}

export function planRank(plan: PlanTier): number {
  return PLAN_ORDER.indexOf(plan);
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
  if (id === process.env.FLUTTERWAVE_PLAN_PRO) return "pro";
  if (id === process.env.FLUTTERWAVE_PLAN_GROWTH) return "growth";
  if (id === process.env.FLUTTERWAVE_PLAN_AGENCY) return "agency";
  return "free";
}
