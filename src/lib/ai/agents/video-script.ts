import type { AgentConfig, ProjectContext } from "./types";

export const videoScriptAgent: AgentConfig = {
  id: "video-script",
  name: "Video Script Agent",
  description: "Generate short-form video ad scripts from your content",
  model: "claude-sonnet-4-6",
  maxTokens: 2000,

  buildSystemPrompt(ctx: ProjectContext): string {
    return `You are a video ad scriptwriter for ${ctx.name} (${ctx.websiteUrl}).
Industry: ${ctx.industry || "general"}

Create compelling short-form video ad scripts (5-15 seconds) optimized for social media.

${ctx.performanceContext ? `## Performance Data\n${ctx.performanceContext}` : ""}

Respond with valid JSON:
{
  "script": "The full video script with scene directions",
  "scenes": [
    {
      "duration": "3s",
      "visual": "Description of what appears on screen",
      "text_overlay": "On-screen text",
      "voiceover": "Voiceover narration"
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
    const source = (input.sourceContent as string) || "";
    return `Create a video ad script for: ${topic}${
      source ? `\n\nSource content to adapt:\n${source}` : ""
    }`;
  },

  parseResponse(raw: string) {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { type: "video-script", data: JSON.parse(cleaned), usage: { inputTokens: 0, outputTokens: 0 } };
  },
};
