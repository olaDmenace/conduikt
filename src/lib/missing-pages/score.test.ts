// @vitest-environment node
import { describe, expect, it } from "vitest";
import { estimatedVolume, gapTerm, intentWeight, rankCandidates, scoreQuery } from "./score";
import type { GapMatch } from "./types";

describe("score terms", () => {
  it("weights booking intent up and how-to down", () => {
    expect(intentWeight("plumber near me")).toBe(1.3);
    expect(intentWeight("emergency plumbing")).toBe(1.3);
    expect(intentWeight("how to unblock a drain")).toBe(0.8);
    expect(intentWeight("conduikt alternative")).toBe(1);
  });

  it("drops strong matches and discounts weak ones", () => {
    expect(gapTerm("none")).toBe(1);
    expect(gapTerm("weak")).toBe(0.6);
    expect(gapTerm("strong")).toBe(0);
  });

  it("flags estimated volume when the provider had nothing", () => {
    const s = scoreQuery({ query: "plumber near me", monthlySearches: null, competition: null, strength: "none" });
    expect(s.estimated).toBe(true);
    expect(s.volumeUsed).toBe(estimatedVolume("plumber near me"));
    const real = scoreQuery({ query: "plumber near me", monthlySearches: 5000, competition: "low", strength: "none" });
    expect(real.estimated).toBe(false);
    expect(real.score).toBeGreaterThan(s.score);
  });

  it("prefers low competition", () => {
    const low = scoreQuery({ query: "x", monthlySearches: 1000, competition: "low", strength: "none" }).score;
    const high = scoreQuery({ query: "x", monthlySearches: 1000, competition: "high", strength: "none" }).score;
    expect(low).toBeGreaterThan(high);
  });
});

describe("rankCandidates", () => {
  const gaps: GapMatch[] = [
    { query: "drain cleaning near me", matchedUrl: "https://a/drains", matchScore: 0.9, strength: "strong" },
    { query: "emergency plumbing lekki", matchedUrl: "https://a/", matchScore: 0.5, strength: "weak" },
    { query: "water heater cost", matchedUrl: null, matchScore: 0, strength: "none" },
    { query: "how to fix a tap", matchedUrl: null, matchScore: 0, strength: "none" },
  ];

  it("orders by score, marks update vs new, drops strong matches", () => {
    const ranked = rankCandidates(gaps, [
      { query: "emergency plumbing lekki", monthlySearches: 900, competition: "low" },
      { query: "water heater cost", monthlySearches: 900, competition: "low" },
      { query: "how to fix a tap", monthlySearches: 900, competition: "low" },
    ]);
    // booking x no page (1.3) > how-to x no page (0.8) > booking x weak match (1.3 x 0.6 = 0.78)
    expect(ranked.map((r) => r.query)).toEqual(["water heater cost", "how to fix a tap", "emergency plumbing lekki"]);
    expect(ranked[0].kind).toBe("new");
    expect(ranked[2].kind).toBe("update");
    expect(ranked[2].matchedUrl).toBe("https://a/");
    expect(ranked.some((r) => r.query === "drain cleaning near me")).toBe(false);
    expect(ranked.every((r) => !r.estimated)).toBe(true);
  });

  it("marks candidates estimated when volume is missing", () => {
    const ranked = rankCandidates(gaps, []);
    expect(ranked.every((r) => r.estimated && r.monthlySearches === null)).toBe(true);
  });
});
