import type { SkillConfig, ProjectContext, SkillOutput } from "./types";

export const pageCroSkill: SkillConfig = {
  id: "page-cro",
  name: "Page CRO",
  description: "Landing page conversion rate optimization analysis",
  model: "claude-sonnet-4-5-20250929",
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => `
You are a conversion rate optimization expert analyzing a landing page.

## Project Context
- Website: ${context.websiteUrl}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Brand voice: ${JSON.stringify(context.brandVoice)}

## Your Task
Analyze the page for conversion optimization opportunities. Focus on:
1. Headline clarity and impact
2. CTA placement, copy, and design
3. Social proof and trust signals
4. Friction points in the user journey
5. Above-the-fold content effectiveness
6. Copy clarity and persuasiveness

## Output Format
Return valid JSON:
{
  "score": number (0-100),
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "headline" | "cta" | "copy" | "layout" | "trust" | "friction",
      "title": "string",
      "detail": "string",
      "recommendation": "string (specific, actionable)",
      "impact": "high" | "medium" | "low"
    }
  ],
  "quick_wins": ["string (top 3 highest-impact, lowest-effort changes)"],
  "summary": "string"
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Analyze this page for CRO: ${input.url}

Page HTML:
\`\`\`html
${(input.html as string).substring(0, 30000)}
\`\`\`
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? response);
    return {
      type: "cro_report",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
