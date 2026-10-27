// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Previews fall back to generic samples when the writing service is
// unavailable, and say so on every item.

vi.mock("@/src/lib/ai/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/src/lib/ai/client")>();
  return { ...real, generateWithClaude: vi.fn() };
});

import { AIUnavailableError, generateWithClaude } from "@/src/lib/ai/client";
import { generateAgentPreviews, hasSamplePreviews, previewMode } from "@/src/lib/first-week/previews";
import { FIRST_WEEK_AGENT_IDS, normalizePreviews } from "@/src/lib/first-week/plan";
import { sampleMagicAudit, samplePreviews, SAMPLE_PREVIEWS } from "@/src/lib/ai/samples";
import { scoreToGrade } from "@/src/lib/onboarding/magic-audit";

const generate = vi.mocked(generateWithClaude);

const signal = {
  url: "https://example.com",
  title: "Example",
  metaDescription: null,
  h1: "Welcome",
  bodyText: "We fix things.",
};

const realReply = (ids: string[]) =>
  JSON.stringify({ previews: ids.map((agentId) => ({ agentId, headline: `Real for ${agentId}`, items: ["one", "two"] })) });

describe("generateAgentPreviews", () => {
  const env = { ...process.env };
  beforeEach(() => {
    generate.mockReset();
    delete process.env.AI_PREVIEW_MODE;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("returns real previews, unflagged, when the model answers", async () => {
    generate.mockResolvedValue({
      content: realReply(["seo-audit", "copywriting"]),
      model: "claude-haiku-4-5",
      inputTokens: 1,
      outputTokens: 1,
      durationMs: 1,
      stopReason: "end_turn",
    });
    const out = await generateAgentPreviews(signal, ["seo-audit", "copywriting"]);
    expect(out.map((p) => p.headline)).toEqual(["Real for seo-audit", "Real for copywriting"]);
    expect(hasSamplePreviews(out)).toBe(false);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5" }));
  });

  it("falls back to samples when the writing service is unavailable (default mode)", async () => {
    generate.mockRejectedValue(new AIUnavailableError("no_credit"));
    const out = await generateAgentPreviews(signal, ["copywriting", "seo-audit", "video-ad"]);
    // Registry order, only the asked-for agents, every one flagged.
    expect(out.map((p) => p.agentId)).toEqual(["seo-audit", "copywriting", "video-ad"]);
    expect(out.every((p) => p.sample === true)).toBe(true);
    expect(out.every((p) => p.headline.length > 0 && p.items.length >= 2)).toBe(true);
    expect(hasSamplePreviews(out)).toBe(true);
  });

  it("rethrows when AI_PREVIEW_MODE is off", async () => {
    process.env.AI_PREVIEW_MODE = "off";
    expect(previewMode()).toBe("off");
    generate.mockRejectedValue(new AIUnavailableError("overloaded"));
    await expect(generateAgentPreviews(signal, ["seo-audit"])).rejects.toBeInstanceOf(AIUnavailableError);
  });

  it("never calls the model when AI_PREVIEW_MODE is always", async () => {
    process.env.AI_PREVIEW_MODE = "always";
    const out = await generateAgentPreviews(signal, ["seo-audit"]);
    expect(generate).not.toHaveBeenCalled();
    expect(out).toHaveLength(1);
    expect(out[0].sample).toBe(true);
  });

  it("does not sample over errors that are not about availability", async () => {
    generate.mockRejectedValue(new Error("parse failed"));
    await expect(generateAgentPreviews(signal, ["seo-audit"])).rejects.toThrow("parse failed");
  });

  it("returns nothing for no agents without calling the model", async () => {
    expect(await generateAgentPreviews(signal, [])).toEqual([]);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("samples", () => {
  it("has one well-formed sample preview for every first-week agent", () => {
    expect(SAMPLE_PREVIEWS.map((p) => p.agentId).sort()).toEqual([...FIRST_WEEK_AGENT_IDS].sort());
    const normalized = normalizePreviews(SAMPLE_PREVIEWS);
    expect(normalized).toHaveLength(FIRST_WEEK_AGENT_IDS.length);
    for (const p of normalized) {
      expect(p.headline.length).toBeLessThanOrEqual(160);
      expect(p.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the samples plain: no emojis, no exclamation marks", () => {
    const text = JSON.stringify(SAMPLE_PREVIEWS) + JSON.stringify(sampleMagicAudit("https://example.com"));
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("samplePreviews filters, orders and flags", () => {
    const out = samplePreviews(["blog-post", "seo-audit"]);
    expect(out.map((p) => p.agentId)).toEqual(["seo-audit", "blog-post"]);
    expect(out.every((p) => p.sample)).toBe(true);
  });

  it("sampleMagicAudit matches the audit shape and is flagged", () => {
    const a = sampleMagicAudit("https://example.com");
    expect(a.sample).toBe(true);
    expect(a.seoGrade).toBe(scoreToGrade(a.seoScore));
    expect(a.topIssues).toHaveLength(3);
    expect(a.sampleLinkedInPosts).toHaveLength(3);
    for (const post of a.sampleLinkedInPosts) {
      expect(post.text.length).toBeGreaterThanOrEqual(400);
      expect(post.text.length).toBeLessThanOrEqual(1400);
    }
    expect(a.brandVoice.tone).toBeTruthy();
    // A fresh copy every time, so callers can't change the fixture.
    expect(sampleMagicAudit("x")).not.toBe(a);
  });
});
