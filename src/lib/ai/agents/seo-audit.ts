import type { SkillConfig, ProjectContext, SkillOutput } from "./types";

export const seoAuditSkill: SkillConfig = {
  id: "seo-audit",
  name: "SEO Audit",
  description: "Comprehensive technical and on-page SEO analysis",
  model: "claude-sonnet-4-6",
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert SEO auditor analyzing a website for technical and on-page SEO issues.

## Project Context
- Website: ${context.websiteUrl}
- Industry: ${context.industry || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Known competitors: ${JSON.stringify(context.competitors)}

## Your Task
Analyze the provided page HTML and return a structured audit with:
1. Overall SEO score (0-100)
2. Critical issues (must fix immediately)
3. Warnings (should fix soon)
4. Opportunities (nice to have)
5. For each finding: title, explanation, specific fix with code if applicable

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after) matching this schema:
{
  "score": number,
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "meta" | "content" | "technical" | "performance" | "schema",
      "title": "string",
      "detail": "string",
      "fix": "string (include code snippets where relevant)",
      "impact": "high" | "medium" | "low"
    }
  ],
  "summary": "string (2-3 sentence executive summary)"
}

Focus on actionable, specific findings. Don't flag generic best practices — only issues actually present on this page.
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Audit this page: ${input.url}

Page HTML:
\`\`\`html
${(input.html as string).substring(0, 30000)}
\`\`\`
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? response);
    return {
      type: "audit_report",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
