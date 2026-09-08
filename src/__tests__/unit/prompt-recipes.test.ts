import { describe, it, expect } from "vitest";
import { PROMPT_RECIPES, getRecipe } from "@/src/lib/ai/prompt-recipes";

describe("prompt recipes library", () => {
  it("exports the expected core frameworks", () => {
    const ids = PROMPT_RECIPES.map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "aida",
        "pas",
        "bab",
        "contrarian-hook",
        "feature-benefit-emotion",
        "data-backed",
      ])
    );
  });

  it("keeps the library small enough to avoid choice paralysis", () => {
    // Intentional cap. If the count creeps above 8, revisit whether
    // more recipes actually help or just add noise.
    expect(PROMPT_RECIPES.length).toBeLessThanOrEqual(8);
  });

  it("has non-empty name, hint, and template for every recipe", () => {
    for (const r of PROMPT_RECIPES) {
      expect(r.name.trim().length).toBeGreaterThan(0);
      expect(r.usageHint.trim().length).toBeGreaterThan(0);
      expect(r.template.trim().length).toBeGreaterThan(0);
    }
  });

  it("ships templates with fillable bracketed placeholders", () => {
    // The whole point is that users edit these — if a template ships
    // with zero placeholders it's just a static prompt.
    for (const r of PROMPT_RECIPES) {
      expect(r.template).toMatch(/\[[A-Z_ →/-]+\]/);
    }
  });

  it("has unique ids (no collisions)", () => {
    const ids = PROMPT_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("getRecipe", () => {
    it("returns the matching recipe by id", () => {
      const r = getRecipe("aida");
      expect(r?.name).toBe("AIDA");
    });

    it("returns undefined for an unknown id", () => {
      expect(getRecipe("not-a-real-recipe")).toBeUndefined();
    });
  });
});
