import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const socialContentSkill: SkillConfig = {
  id: "social-content",
  name: "Social Content",
  description: "Social media content creation for X and LinkedIn",
  model: "claude-sonnet-4-6",
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => `
You are a social media strategist who creates engaging content for X (Twitter) and LinkedIn.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Brand voice: ${JSON.stringify(context.brandVoice)}

## Platform Rules
X (Twitter):
- Max 280 characters
- Hooks in the first line
- No hashtags (they look spammy)
- Threads for longer content

LinkedIn:
- 400-700 characters for optimal engagement
- First line is the hook (before "see more")
- Use line breaks for readability
- Professional but human tone
- No hashtag spam (3 max, at end)

## Content Angles
Rotate between: educational, storytelling, opinion/hot take, data/stats, behind-the-scenes, social proof
${context.performanceContext || ""}

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "posts": [
    {
      "platform": "x" | "linkedin",
      "text": "string",
      "angle": "string",
      "hook": "string (the first line)",
      "image_suggestion": "string | null",
      "best_time": "string (suggested posting time)"
    }
  ]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Generate ${input.count || 5} social posts.

Topic/angle: ${input.topic || "General marketing for the product"}
Channels: ${input.channels || "x, linkedin"}
Tone preference: ${input.tone || "Default brand voice"}
Additional context: ${input.context || "None"}
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "social_posts",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
