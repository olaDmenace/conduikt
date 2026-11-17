// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  EMAIL_LIMITS,
  GENERATION_LIMITS,
  LOCAL_PLAN_FEATURES,
  PLAN_ORDER,
  PLAN_PRICING,
  PLAN_RANK,
  PROJECT_LIMITS,
  flutterwavePlanToTier,
  getFlutterwavePlanId,
  getPaystackPlanCode,
  isLocalPlanEnabled,
  isPlanAtLeast,
  nextUpgradeTier,
  normalizePlan,
  paystackPlanToTier,
  planCurrency,
  planRank,
} from "@/src/lib/plans";

const env = { ...process.env };
beforeEach(() => {
  delete process.env.FLUTTERWAVE_PLAN_LOCAL;
  delete process.env.PAYSTACK_PLAN_LOCAL;
  delete process.env.FLUTTERWAVE_PLAN_PRO;
  delete process.env.PAYSTACK_PLAN_PRO;
});
afterEach(() => {
  process.env = { ...env };
});

describe("local tier rank", () => {
  it("sits between free and pro", () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.local);
    expect(PLAN_RANK.local).toBeLessThan(PLAN_RANK.pro);
    expect(planRank("free")).toBeLessThan(planRank("local"));
    expect(planRank("local")).toBeLessThan(planRank("pro"));
    expect(planRank("pro")).toBeLessThan(planRank("growth"));
    expect(planRank("growth")).toBeLessThan(planRank("agency"));
    expect(isPlanAtLeast("local", "free")).toBe(true);
    expect(isPlanAtLeast("local", "pro")).toBe(false);
    expect(isPlanAtLeast("pro", "local")).toBe(true);
    expect(isPlanAtLeast("free", "local")).toBe(false);
  });

  it("has limits between free and pro, and one project", () => {
    expect(GENERATION_LIMITS.local).toBeGreaterThan(GENERATION_LIMITS.free);
    expect(GENERATION_LIMITS.local).toBeLessThanOrEqual(GENERATION_LIMITS.pro / 2);
    expect(PROJECT_LIMITS.local).toBe(1);
    expect(EMAIL_LIMITS.local.emailsPerMonth).toBeGreaterThan(EMAIL_LIMITS.free.emailsPerMonth);
    expect(EMAIL_LIMITS.local.emailsPerMonth).toBeLessThan(EMAIL_LIMITS.pro.emailsPerMonth);
    expect(EMAIL_LIMITS.local.customDomain).toBe(false);
  });

  it("normalizes 'local' and still falls back to free for junk", () => {
    expect(normalizePlan("local")).toBe("local");
    expect(normalizePlan("pro")).toBe("pro");
    expect(normalizePlan("enterprise")).toBe("free");
    expect(normalizePlan(null)).toBe("free");
  });

  it("lists the Local pack in plain words", () => {
    const text = LOCAL_PLAN_FEATURES.join(" ").toLowerCase();
    for (const word of ["missing pages", "hosted page", "whatsapp", "review", "leads"]) {
      expect(text).toContain(word);
    }
    expect(text).not.toMatch(/\b(seo|aeo|geo|cro)\b/);
  });
});

describe("upgrade ladder", () => {
  it("is the dollar tiers only: Local is never an upgrade target", () => {
    // src/components/usage/limit-modal.tsx indexes PLAN_ORDER by the
    // user's plan + 1, so a Free user must land on Pro whether or not
    // the Local plan is switched on.
    expect(PLAN_ORDER).toEqual(["free", "pro", "growth", "agency"]);
    expect(PLAN_ORDER).not.toContain("local");
    expect(PLAN_ORDER[PLAN_ORDER.indexOf("free") + 1]).toBe("pro");
  });

  it("offers the next dollar tier up, and Pro to a Local user", () => {
    expect(nextUpgradeTier("free")).toBe("pro");
    expect(nextUpgradeTier("local")).toBe("pro");
    expect(nextUpgradeTier("pro")).toBe("growth");
    expect(nextUpgradeTier("growth")).toBe("agency");
    expect(nextUpgradeTier("agency")).toBeNull();
  });
});

describe("currency selection", () => {
  it("charges Local in naira and everything else in dollars", () => {
    expect(planCurrency("local")).toBe("NGN");
    expect(PLAN_PRICING.local).toEqual({ price: 15000, label: "₦15,000", currency: "NGN" });
    for (const tier of ["free", "pro", "growth", "agency"] as const) {
      expect(planCurrency(tier)).toBe("USD");
      expect(PLAN_PRICING[tier].label.startsWith("$")).toBe(true);
    }
  });

  it("is offered once a Local plan id exists with either provider", () => {
    expect(isLocalPlanEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    // Both the Flutterwave client and its webhook take the tier's own
    // currency now, so a Flutterwave-only Local plan is enough.
    expect(isLocalPlanEnabled({ FLUTTERWAVE_PLAN_LOCAL: "123" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isLocalPlanEnabled({ PAYSTACK_PLAN_LOCAL: "PLN_x" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("provider plan ids", () => {
  it("reads FLUTTERWAVE_PLAN_LOCAL and PAYSTACK_PLAN_LOCAL, both ways", () => {
    expect(getFlutterwavePlanId("local")).toBeNull();
    expect(getPaystackPlanCode("local")).toBeNull();

    process.env.FLUTTERWAVE_PLAN_LOCAL = "55501";
    process.env.PAYSTACK_PLAN_LOCAL = "PLN_local";
    process.env.FLUTTERWAVE_PLAN_PRO = "55502";

    expect(getFlutterwavePlanId("local")).toBe("55501");
    expect(getPaystackPlanCode("local")).toBe("PLN_local");
    expect(flutterwavePlanToTier(55501)).toBe("local");
    expect(flutterwavePlanToTier("55502")).toBe("pro");
    expect(flutterwavePlanToTier("")).toBe("free");
    expect(paystackPlanToTier("PLN_local")).toBe("local");
    expect(paystackPlanToTier("PLN_other")).toBe("free");
  });
});
