import type { AgentConfig, ProjectContext } from "./types";
import { modelFor } from "../model-routing";

export const contentScorerAgent: AgentConfig = {
  id: "content-scorer",
  name: "Content Scorer Agent",
  description: "Score content across clarity, relevance, engagement, and brand alignment",
  // Short, structured and frequent: the cheap model (see model-routing).
  model: modelFor("score"),
  maxTokens: 2048,

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

Then score one more dimension separately, which is NOT part of the total:

5. **answerability** (0–100): How usable is this as a direct answer for Google's answer features and assistants such as ChatGPT? Award points for each of these that is present, and nothing for ones that are missing:
   - A direct answer to the piece's main question in the first two sentences (up to 30)
   - Headings phrased as the questions people actually ask (up to 20)
   - One plain sentence saying who the business is, what it does and where (up to 20)
   - A short questions-and-answers section, where the format allows one (up to 15; a social post or ad gets these points only if it still answers one question outright)
   - A visible date, published or updated (up to 15)

IMPORTANT: Score strictly. Not every piece is an 80+. Average content should score 50–65. Only genuinely excellent content scores above 80.

Respond with ONLY valid JSON, no markdown fences:
{
  "total_score": number,
  "clarity": number,
  "relevance": number,
  "engagement_potential": number,
  "brand_alignment": number,
  "answerability": number,
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
    const data = JSON.parse(cleaned) as Record<string, unknown>;
    // The dimension is always present so the UI can render it by key; the
    // route blends it with the deterministic check before responding.
    if (data && typeof data === "object" && data.answerability === undefined) data.answerability = null;
    return {
      type: "content-score",
      data,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};

/** The dimensions the scorer returns, in display order, with the key the UI reads. */
export const CONTENT_SCORE_DIMENSIONS: ReadonlyArray<{ key: string; label: string; max: number }> = [
  { key: "clarity", label: "Clear", max: 25 },
  { key: "relevance", label: "Fits your audience", max: 25 },
  { key: "engagement_potential", label: "Makes people act", max: 25 },
  { key: "brand_alignment", label: "Sounds like you", max: 25 },
  { key: "answerability", label: "Ready for Google and AI answers", max: 100 },
];
