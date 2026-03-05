import type { AgentConfig, ProjectContext } from "./types";

export const videoScriptAgent: AgentConfig = {
  id: "video-script",
  name: "Video Script Agent",
  description: "Generate short-form video ad scripts from your content",
  model: "claude-sonnet-4-6",
  maxTokens: 3000,

  buildSystemPrompt(ctx: ProjectContext): string {
    return `You are a video ad scriptwriter for ${ctx.name} (${ctx.websiteUrl}).
Industry: ${ctx.industry || "general"}

Create compelling short-form video ad scripts optimized for social media.

IMPORTANT: Do not describe scenes with consistent human characters across multiple scenes,
as each scene is generated independently. Instead use:
- Abstract animations and motion graphics for hook scenes
- Product UI screenshots and demos for feature scenes
- Text overlays on branded backgrounds for stat/social proof scenes
- A clean CTA card for the closing scene
Human presenters only appear in the voiceover narration, not the visual descriptions.

${ctx.performanceContext ? `## Performance Data\n${ctx.performanceContext}` : ""}

Respond with valid JSON:
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
  },

  buildUserPrompt(input: Record<string, unknown>): string {
    const topic = (input.topic as string) || (input.brief as string) || "";
    const source = (input.sourceContent as string) || (input.context as string) || "";
    const adLength = (input.adLength as string) || "standard";

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
