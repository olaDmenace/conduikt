import { describe, it, expect } from "vitest";
import {
  EMAIL_LIMITS,
  getEmailLimits,
  canVerifyCustomDomain,
  hasEmailQuotaAvailable,
} from "@/src/lib/plans";

describe("Email plan limits", () => {
  describe("tier shape", () => {
    it("free tier sits at 1 audience / 100 contacts / 50 emails / no custom domain", () => {
      expect(EMAIL_LIMITS.free.audiences).toBe(1);
      expect(EMAIL_LIMITS.free.contactsPerAudience).toBe(100);
      expect(EMAIL_LIMITS.free.emailsPerMonth).toBe(50);
      expect(EMAIL_LIMITS.free.customDomain).toBe(false);
    });

    it("pro tier unlocks custom domain", () => {
      expect(EMAIL_LIMITS.pro.customDomain).toBe(true);
      expect(EMAIL_LIMITS.pro.emailsPerMonth).toBe(10_000);
    });

    it("agency audiences cap is unlimited", () => {
      expect(EMAIL_LIMITS.agency.audiences).toBe(Number.POSITIVE_INFINITY);
    });

    it("higher tiers always have >= lower-tier emails-per-month", () => {
      expect(EMAIL_LIMITS.pro.emailsPerMonth).toBeGreaterThan(EMAIL_LIMITS.free.emailsPerMonth);
      expect(EMAIL_LIMITS.growth.emailsPerMonth).toBeGreaterThan(EMAIL_LIMITS.pro.emailsPerMonth);
      expect(EMAIL_LIMITS.agency.emailsPerMonth).toBeGreaterThan(EMAIL_LIMITS.growth.emailsPerMonth);
    });
  });

  describe("hasEmailQuotaAvailable", () => {
    it("free user under quota can send", () => {
      expect(hasEmailQuotaAvailable("free", 0)).toBe(true);
      expect(hasEmailQuotaAvailable("free", 49)).toBe(true);
    });

    it("free user at quota cannot send", () => {
      expect(hasEmailQuotaAvailable("free", 50)).toBe(false);
      expect(hasEmailQuotaAvailable("free", 100)).toBe(false);
    });

    it("agency user can send up to 200k/mo and is gated above that", () => {
      // Agency is capped (not Infinity) because Resend bills per email —
      // truly unlimited would be a runaway-cost surface.
      expect(hasEmailQuotaAvailable("agency", 0)).toBe(true);
      expect(hasEmailQuotaAvailable("agency", 199_999)).toBe(true);
      expect(hasEmailQuotaAvailable("agency", 200_000)).toBe(false);
      expect(hasEmailQuotaAvailable("agency", 1_000_000)).toBe(false);
    });
  });

  describe("canVerifyCustomDomain", () => {
    it("free tier rejects custom domain", () => {
      expect(canVerifyCustomDomain("free")).toBe(false);
    });

    it("pro / growth / agency all allow custom domain", () => {
      expect(canVerifyCustomDomain("pro")).toBe(true);
      expect(canVerifyCustomDomain("growth")).toBe(true);
      expect(canVerifyCustomDomain("agency")).toBe(true);
    });
  });

  describe("getEmailLimits", () => {
    it("returns the tier-specific limits object", () => {
      expect(getEmailLimits("pro")).toEqual(EMAIL_LIMITS.pro);
      expect(getEmailLimits("free")).toEqual(EMAIL_LIMITS.free);
    });
  });

  describe("sequence limits", () => {
    it("free is 1, pro 10, growth 50, agency unlimited", () => {
      expect(EMAIL_LIMITS.free.sequences).toBe(1);
      expect(EMAIL_LIMITS.pro.sequences).toBe(10);
      expect(EMAIL_LIMITS.growth.sequences).toBe(50);
      expect(EMAIL_LIMITS.agency.sequences).toBe(Number.POSITIVE_INFINITY);
    });

    it("higher tiers always allow >= lower-tier sequence count", () => {
      expect(EMAIL_LIMITS.pro.sequences).toBeGreaterThan(EMAIL_LIMITS.free.sequences);
      expect(EMAIL_LIMITS.growth.sequences).toBeGreaterThan(EMAIL_LIMITS.pro.sequences);
      expect(EMAIL_LIMITS.agency.sequences).toBeGreaterThan(EMAIL_LIMITS.growth.sequences);
    });
  });
});
