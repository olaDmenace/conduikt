// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHEAP_MODEL,
  CURRENT_MODEL_PRICING,
  DEFAULT_MODEL,
  effortFor,
  estimateCostUsd,
  FALLBACK_PRICING_MODEL,
  isAIModel,
  isEffort,
  MODEL_PRICING,
  modelFor,
  resetModelRoutingWarnings,
} from "@/src/lib/ai/model-routing";
import { contentScorerAgent } from "@/src/lib/ai/agents/content-scorer";
import { blogPostSkill } from "@/src/lib/ai/agents/blog-post";

const env = { ...process.env };
beforeEach(() => {
  delete process.env.AI_MODEL_DEFAULT;
  delete process.env.AI_MODEL_CHEAP;
  delete process.env.AI_EFFORT_DEFAULT;
  delete process.env.AI_EFFORT_CHEAP;
  resetModelRoutingWarnings();
});
afterEach(() => {
  process.env = { ...env };
  vi.restoreAllMocks();
});

describe("modelFor", () => {
  it("sends previews and scores to the cheap model", () => {
    expect(modelFor("preview")).toBe("claude-haiku-5-5");
    expect(modelFor("score")).toBe("claude-haiku-5-5");
    expect(CHEAP_MODEL).toBe("claude-haiku-5-5");
  });

  it("keeps generation and analysis on the default model", () => {
    expect(modelFor("generate")).toBe("claude-opus-5-5");
    expect(modelFor("analyze")).toBe("claude-opus-5-5");
    expect(DEFAULT_MODEL).toBe("claude-opus-5-5");
  });

  it("routes the same for every plan", () => {
    expect(modelFor("preview", "free")).toBe(modelFor("preview", "agency"));
    expect(modelFor("generate", "free")).toBe(modelFor("generate", "agency"));
  });

  it("honours AI_MODEL_DEFAULT and AI_MODEL_CHEAP", () => {
    process.env.AI_MODEL_DEFAULT = "claude-sonnet-5-5";
    process.env.AI_MODEL_CHEAP = "claude-sonnet-5-5";
    expect(modelFor("generate")).toBe("claude-sonnet-5-5");
    expect(modelFor("analyze")).toBe("claude-sonnet-5-5");
    expect(modelFor("preview")).toBe("claude-sonnet-5-5");
    expect(modelFor("score")).toBe("claude-sonnet-5-5");
  });

  it("rejects a legacy 4.x id with one warning, because every request sends effort", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Haiku 4.5 rejects output_config.effort outright; a request to it would 400.
    process.env.AI_MODEL_CHEAP = "claude-haiku-4-5";
    expect(modelFor("preview")).toBe("claude-haiku-5-5");
    expect(modelFor("score")).toBe("claude-haiku-5-5");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("AI_MODEL_CHEAP");
    expect(warn.mock.calls[0][0]).toContain("claude-haiku-4-5");
    // The 4.6 ids reject "xhigh"; they are out too, whatever the effort.
    process.env.AI_MODEL_DEFAULT = "claude-sonnet-4-6";
    process.env.AI_EFFORT_DEFAULT = "xhigh";
    expect(modelFor("generate")).toBe("claude-opus-5-5");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[1][0]).toContain("claude-sonnet-4-6");
  });

  it("ignores blank overrides", () => {
    process.env.AI_MODEL_CHEAP = "  ";
    expect(modelFor("preview")).toBe("claude-haiku-5-5");
  });

  it("ignores an unknown model id with one warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.AI_MODEL_DEFAULT = "claude-opus-9-9";
    expect(modelFor("generate")).toBe("claude-opus-5-5");
    expect(modelFor("analyze")).toBe("claude-opus-5-5");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("AI_MODEL_DEFAULT");
    expect(warn.mock.calls[0][0]).toContain("claude-opus-9-9");
    // A different bad value gets its own warning.
    process.env.AI_MODEL_DEFAULT = "gpt-5";
    expect(modelFor("generate")).toBe("claude-opus-5-5");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("knows every id a request may target and nothing else", () => {
    for (const id of ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]) {
      expect(isAIModel(id)).toBe(true);
    }
    // Legacy ids are priced (for old rows) but never sent.
    for (const id of ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5", "claude-sonnet-4-5-20250929"]) {
      expect(isAIModel(id)).toBe(false);
      expect(MODEL_PRICING[id]).toBeDefined();
    }
    expect(isAIModel("")).toBe(false);
    expect(isAIModel(undefined)).toBe(false);
    expect(isAIModel("constructor")).toBe(false);
  });
});

describe("effortFor", () => {
  it("thinks at medium for generation and analysis, low for previews and scores", () => {
    expect(effortFor("generate")).toBe("medium");
    expect(effortFor("analyze")).toBe("medium");
    expect(effortFor("preview")).toBe("low");
    expect(effortFor("score")).toBe("low");
  });

  it("honours AI_EFFORT_DEFAULT and AI_EFFORT_CHEAP", () => {
    process.env.AI_EFFORT_DEFAULT = "high";
    process.env.AI_EFFORT_CHEAP = "medium";
    expect(effortFor("generate")).toBe("high");
    expect(effortFor("analyze")).toBe("high");
    expect(effortFor("preview")).toBe("medium");
    expect(effortFor("score")).toBe("medium");
  });

  it("ignores an unknown effort with one warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.AI_EFFORT_CHEAP = "turbo";
    expect(effortFor("preview")).toBe("low");
    expect(effortFor("score")).toBe("low");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("AI_EFFORT_CHEAP");
  });

  it("accepts every effort level the API takes", () => {
    for (const e of ["low", "medium", "high", "xhigh", "max"]) expect(isEffort(e)).toBe(true);
    expect(isEffort("none")).toBe(false);
    expect(isEffort(1)).toBe(false);
  });
});

describe("agent routing", () => {
  it("scores on the cheap model", () => {
    expect(contentScorerAgent.model).toBe("claude-haiku-5-5");
  });

  it("generates on the default model", () => {
    expect(blogPostSkill.model).toBe("claude-opus-5-5");
  });

  it("asks for at least 2048 tokens so adaptive thinking cannot eat the answer", () => {
    expect(contentScorerAgent.maxTokens).toBeGreaterThanOrEqual(2048);
  });
});

describe("estimateCostUsd", () => {
  it("prices current models per million tokens", () => {
    expect(estimateCostUsd("claude-opus-5-5", 1_000_000, 0)).toBe(4);
    expect(estimateCostUsd("claude-opus-5-5", 0, 1_000_000)).toBe(20);
    expect(estimateCostUsd("claude-sonnet-5-5", 1_000_000, 1_000_000)).toBe(12);
    expect(estimateCostUsd("claude-haiku-5-5", 1_000_000, 1_000_000)).toBeCloseTo(0.6, 9);
  });

  it("still prices legacy rows at what they cost", () => {
    expect(estimateCostUsd("claude-sonnet-4-6", 1_000_000, 0)).toBe(3);
    expect(estimateCostUsd("claude-sonnet-4-6", 0, 1_000_000)).toBe(15);
    expect(estimateCostUsd("claude-sonnet-4-5-20250929", 1_000_000, 0)).toBe(3);
    expect(estimateCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000)).toBe(6);
    expect(estimateCostUsd("claude-opus-4-6", 1_000_000, 0)).toBe(15);
  });

  it("lists the current models with their list prices for display", () => {
    expect(CURRENT_MODEL_PRICING.map((m) => m.id)).toEqual(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);
    for (const m of CURRENT_MODEL_PRICING) {
      expect(isAIModel(m.id)).toBe(true);
      expect(m.input).toBe(MODEL_PRICING[m.id].input);
      expect(m.output).toBe(MODEL_PRICING[m.id].output);
    }
    expect(CURRENT_MODEL_PRICING[2]).toMatchObject({ label: "Haiku 5.5", input: 0.1, output: 0.5 });
  });

  it("prices unknown or missing models as Opus 5.5, which errs high", () => {
    expect(FALLBACK_PRICING_MODEL).toBe("claude-opus-5-5");
    const opus = MODEL_PRICING["claude-opus-5-5"];
    expect(estimateCostUsd("claude-mystery-1", 1_000_000, 0)).toBe(opus.input);
    expect(estimateCostUsd(null, 0, 1_000_000)).toBe(opus.output);
    expect(estimateCostUsd(undefined, 0, 0)).toBe(0);
    // No current model is dearer than the fallback.
    for (const [id, p] of Object.entries(MODEL_PRICING)) {
      if (id.endsWith("-5-5")) {
        expect(p.input).toBeLessThanOrEqual(opus.input);
        expect(p.output).toBeLessThanOrEqual(opus.output);
      }
    }
  });
});
