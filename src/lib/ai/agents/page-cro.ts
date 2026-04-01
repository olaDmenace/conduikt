import type { SkillConfig, ProjectContext, SkillOutput } from "./types";

export const pageCroSkill: SkillConfig = {
  id: "page-cro",
  name: "Page CRO",
  description: "Landing page conversion rate optimization analysis",
  model: "claude-sonnet-4-6",
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

  buildUserPrompt: (input: Record<string, unknown>) => {
    const url = input.url ?? "";
    const context = input.context ?? "";
    const html = input.html as string | undefined;

    if (html) {
      return `Analyze this page for CRO: ${url}\n\nPage HTML:\n\`\`\`html\n${html.substring(0, 30000)}\n\`\`\``;
    }

    return `Analyze this page/flow for CRO: ${url}\n\nAdditional context: ${context}\n\nNote: No page HTML was provided. Provide your CRO analysis based on the URL, project context, and the description above. Focus on general best practices for this type of page and provide actionable recommendations.`;
  },

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
