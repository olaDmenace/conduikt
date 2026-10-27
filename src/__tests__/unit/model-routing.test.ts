// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHEAP_MODEL, DEFAULT_MODEL, estimateCostUsd, MODEL_PRICING, modelFor } from "@/src/lib/ai/model-routing";
import { contentScorerAgent } from "@/src/lib/ai/agents/content-scorer";

describe("modelFor", () => {
  const env = { ...process.env };
  beforeEach(() => {
    delete process.env.AI_MODEL_DEFAULT;
    delete process.env.AI_MODEL_CHEAP;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("sends previews and scores to the cheap model", () => {
    expect(modelFor("preview")).toBe("claude-haiku-4-5");
    expect(modelFor("score")).toBe("claude-haiku-4-5");
    expect(CHEAP_MODEL).toBe("claude-haiku-4-5");
  });

  it("keeps generation and analysis on the default model", () => {
    expect(modelFor("generate")).toBe("claude-sonnet-4-6");
    expect(modelFor("analyze")).toBe("claude-sonnet-4-6");
    expect(DEFAULT_MODEL).toBe("claude-sonnet-4-6");
  });

  it("routes the same for every plan", () => {
    expect(modelFor("preview", "free")).toBe(modelFor("preview", "agency"));
    expect(modelFor("generate", "free")).toBe(modelFor("generate", "agency"));
  });

  it("honours AI_MODEL_DEFAULT and AI_MODEL_CHEAP", () => {
    process.env.AI_MODEL_DEFAULT = "claude-opus-4-6";
    process.env.AI_MODEL_CHEAP = "claude-sonnet-4-6";
    expect(modelFor("generate")).toBe("claude-opus-4-6");
    expect(modelFor("analyze")).toBe("claude-opus-4-6");
    expect(modelFor("preview")).toBe("claude-sonnet-4-6");
    expect(modelFor("score")).toBe("claude-sonnet-4-6");
  });

  it("ignores blank overrides", () => {
    process.env.AI_MODEL_CHEAP = "  ";
    expect(modelFor("preview")).toBe("claude-haiku-4-5");
  });
});

describe("content scorer routing", () => {
  it("scores on the cheap model", () => {
    expect(contentScorerAgent.model).toBe("claude-haiku-4-5");
  });
});

describe("estimateCostUsd", () => {
  it("prices known models per million tokens", () => {
    expect(estimateCostUsd("claude-sonnet-4-6", 1_000_000, 0)).toBe(3);
    expect(estimateCostUsd("claude-sonnet-4-6", 0, 1_000_000)).toBe(15);
    expect(estimateCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000)).toBe(6);
  });

  it("prices unknown or missing models as the default model", () => {
    const def = MODEL_PRICING[DEFAULT_MODEL];
    expect(estimateCostUsd("claude-mystery-1", 1_000_000, 0)).toBe(def.input);
    expect(estimateCostUsd(null, 0, 1_000_000)).toBe(def.output);
    expect(estimateCostUsd(undefined, 0, 0)).toBe(0);
  });
});
