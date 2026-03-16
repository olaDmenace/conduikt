import type { AgentConfig, ProjectContext } from "./types";

export const contentScorerAgent: AgentConfig = {
  id: "content-scorer",
  name: "Content Scorer Agent",
  description: "Score content across clarity, relevance, engagement, and brand alignment",
  model: "claude-sonnet-4-6",
  maxTokens: 1000,

  buildSystemPrompt(ctx: ProjectContext): string {
    const brandVoice =
      typeof ctx.brandVoice === "object" && ctx.brandVoice
        ? ctx.brandVoice.tone
        : String(ctx.brandVoice ?? "not specified");

    const audience =
      typeof ctx.targetAudience === "object" && ctx.targetAudience
        ? ctx.targetAudience.personas?.join(", ")
        : String(ctx.targetAudience ?? "general audience");

    return `You are a strict content quality scorer for ${ctx.name}.

Brand voice: ${brandVoice}
Target audience: ${audience}
Industry: ${ctx.industry ?? "general"}
${ctx.valueProposition ? `Value proposition: ${ctx.valueProposition}` : ""}

Score the content across exactly four dimensions, each 0–25:

1. **clarity** (0–25): Is the message clear and easy to understand? Deduct for jargon, ambiguity, poor structure, or run-on sentences.

2. **relevance** (0–25): Does it match the project's audience and goals? Deduct if it addresses the wrong audience, misses the industry context, or lacks specificity.

3. **engagement_potential** (0–25): Hook strength, CTA quality, emotional resonance, shareability. Deduct for weak openings, missing CTAs, or flat tone.

4. **brand_alignment** (0–25): Does it match the project's stated brand voice? Deduct if tone is off, language is inconsistent, or it contradicts positioning.

Total score = sum of all four = 0 to 100.

IMPORTANT: Score strictly. Not every piece is an 80+. Average content should score 50–65. Only genuinely excellent content scores above 80.

Respond with ONLY valid JSON, no markdown fences:
{
  "total_score": number,
  "clarity": number,
  "relevance": number,
  "engagement_potential": number,
  "brand_alignment": number,
  "summary": "One sentence explaining the overall score",
  "top_strength": "The single best thing about this content",
  "top_improvement": "The single most impactful change to make"
}`;
  },

  buildUserPrompt(input: Record<string, unknown>): string {
    const content = (input.content as string) || "";
    const contentType = (input.contentType as string) || "general";

    return `Score this ${contentType} content:\n\n${content}`;
  },

  parseResponse(raw: string) {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return {
      type: "content-score",
      data: JSON.parse(cleaned),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
