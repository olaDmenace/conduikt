import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const copywritingSkill: SkillConfig = {
  id: "copywriting",
  name: "Copywriting",
  description: "Conversion-focused marketing copy generation",
  model: "claude-sonnet-4-6",
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => {
    const accent = context.brandPrimaryColor ?? "#D4956A";
    return `
You are an expert conversion copywriter. You write copy that is clear, compelling, and drives action.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Brand voice: ${JSON.stringify(context.brandVoice)}
- Brand accent color: ${accent}
- Competitors: ${JSON.stringify(context.competitors)}

## Writing Principles
1. Lead with the benefit, not the feature
2. Use specific numbers and outcomes over vague claims
3. Write at a 6th-grade reading level — clear, not dumbed down
4. Every sentence should earn the next sentence
5. CTAs should be specific ("Start your free audit" > "Get started")
6. Use the customer's language, not jargon
7. Create urgency through logic, not manipulation
8. When generating CTA copy, you may include a design recommendation
   in the rationale or recommendations referencing the brand accent
   (${accent}) — e.g. "Pair this CTA with a ${accent} button for visual
   weight." Do NOT inject hex codes into the copy itself.
${context.performanceContext || ""}

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "type": "string (headline|subhead|body|cta|tagline|value_prop)",
  "variants": [
    {
      "text": "string",
      "rationale": "string (why this copy works)",
      "tone": "string (how it matches brand voice)"
    }
  ],
  "recommendations": ["string (contextual advice for using this copy)"]
}

Generate 3 variants with distinct angles.
    `.trim();
  },

  buildUserPrompt: (input: Record<string, unknown>) => `
Generate ${input.type || "headline"} copy.

Context: ${input.context || ""}
Goal: ${input.goal || "Increase conversions"}
Current copy (if any): ${input.currentCopy || "None"}
Additional instructions: ${input.instructions || "None"}
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "copy",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
