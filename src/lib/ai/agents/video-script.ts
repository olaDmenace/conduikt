import type { AgentConfig, ProjectContext } from "./types";

const UGC_RULES = `
RULES FOR UGC (User Generated Content) VIDEO:
- Write in first-person casual spoken English
- The hook must land in the first 2 seconds — a question, a bold claim, or a problem the viewer recognises immediately
- No corporate language, no formal narration
- Natural conversational rhythm — short sentences, real pauses
- Target length: 20 to 30 seconds. Maximum: 45 seconds.
- The call to action at the end must be soft and conversational, not a hard sales line
- The speaker is looking directly at camera for the whole video
- No scene directions, no B-roll, no cuts — single continuous take
- Vertical format (9:16) for TikTok, Instagram Reels, YouTube Shorts`;

const UGC_JSON_SCHEMA = `Respond with valid JSON:
{
  "script": "the full word-for-word spoken script",
  "hook": "the opening line, first 2 to 3 seconds",
  "cta": "the closing call to action line",
  "tone": "one of: casual, energetic, relatable, educational",
  "duration_estimate": "e.g. 25s",
  "caption_text": "caption-friendly version, max 6 words per line",
  "hashtags": ["#example", "#hashtags"],
  "platforms": ["tiktok", "instagram_reels", "youtube_shorts"]
}`;

const DEFAULT_JSON_SCHEMA = `Respond with valid JSON:
{
  "script": "The full video script with scene directions",
  "voiceover_script": "The complete voiceover text only — no scene directions, just the words to be spoken aloud",
  "scenes": [
    {
      "duration": "3s",
      "visual": "Description of what appears on screen",
      "text_overlay": "On-screen text",
      "voiceover": "Voiceover narration for this scene"
    }
  ],
  "hook": "The opening hook line",
  "cta": "Call to action text",
  "style": "Visual style recommendation (e.g., kinetic typography, product showcase, testimonial)",
  "platforms": ["tiktok", "instagram_reels", "youtube_shorts"]
}`;

export const videoScriptAgent: AgentConfig = {
  id: "video-script",
  name: "Video Script Agent",
  description: "Generate short-form video ad scripts from your content",
  model: "claude-sonnet-4-6",
  maxTokens: 3000,

  buildSystemPrompt(ctx: ProjectContext): string {
    // Base context — shared across all video types
    const base = `You are a video ad scriptwriter for ${ctx.name} (${ctx.websiteUrl}).
Industry: ${ctx.industry || "general"}

${ctx.performanceContext ? `## Performance Data\n${ctx.performanceContext}` : ""}`;

    // The videoType is injected via a __videoType property on the context
    // (set by the generate route before calling buildSystemPrompt)
    const videoType = (ctx as ProjectContext & { __videoType?: string }).__videoType;

    if (videoType === "ugc") {
      // Inject brand context so UGC scripts feel aligned with the brand
      const brandCtx = ctx.industry || ctx.targetAudience
        ? `\nBRAND CONTEXT:
${ctx.industry ? `- Industry: ${ctx.industry}` : ""}
${ctx.targetAudience ? `- Target audience: ${ctx.targetAudience}` : ""}
${ctx.brandVoice ? `- Brand voice: ${ctx.brandVoice}` : ""}
Match the tone and language to this audience. Speak their language, reference their world.`
        : "";

      return `${base}

${UGC_RULES}${brandCtx}

${UGC_JSON_SCHEMA}`;
    }

    // Presenter and cinematic share the default scene-based format
    return `${base}

Create compelling short-form video ad scripts optimized for social media.

IMPORTANT: Do not describe scenes with consistent human characters across multiple scenes,
as each scene is generated independently. Instead use:
- Abstract animations and motion graphics for hook scenes
- Product UI screenshots and demos for feature scenes
- Text overlays on branded backgrounds for stat/social proof scenes
- A clean CTA card for the closing scene
Human presenters only appear in the voiceover narration, not the visual descriptions.

${DEFAULT_JSON_SCHEMA}`;
  },

  buildUserPrompt(input: Record<string, unknown>): string {
    const topic = (input.topic as string) || (input.brief as string) || "";
    const source = (input.sourceContent as string) || (input.context as string) || "";
    const adLength = (input.adLength as string) || "standard";
    const videoType = (input.videoType as string) || "presenter";

    if (videoType === "ugc") {
      return `Create a UGC-style talking-to-camera video script for: ${topic}

Keep it 20-30 seconds max. Casual, authentic, no corporate tone.
${source ? `\nSource content to adapt:\n${source}` : ""}`;
    }

    const wordGuide: Record<string, string> = {
      short: "Keep the voiceover to 80-100 words total (~30 seconds).",
      standard: "Keep the voiceover to 150-180 words total (~60 seconds).",
      long: "Keep the voiceover to 220-260 words total (~90 seconds).",
    };

    return `Create a video ad script for: ${topic}

Ad length: ${adLength}
${wordGuide[adLength] || wordGuide.standard}
${source ? `\nSource content to adapt:\n${source}` : ""}`;
  },

  parseResponse(raw: string) {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { type: "video-script", data: JSON.parse(cleaned), usage: { inputTokens: 0, outputTokens: 0 } };
  },
};
