import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

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
Analyze the provided page HTML and return a structured audit with findings and a score.

## Scoring Rubric (MUST follow exactly)
Start at 100 and subtract points for each issue found:

**Critical issues (deduct per issue):**
- Missing or empty title tag: -10
- Missing meta description: -8
- Missing H1 or multiple H1s: -8
- No HTTPS: -10
- Broken canonical URL: -8
- Missing viewport meta: -7
- Critical Core Web Vitals failure (if PageSpeed data provided): -8

**Warnings (deduct per issue):**
- Title too long (>60 chars) or too short (<30 chars): -4
- Meta description too long (>160 chars) or too short (<70 chars): -3
- Missing alt text on images (per image, max -8 total): -2
- Missing Open Graph tags: -4
- Missing structured data/schema markup: -4
- Thin content (<300 words): -5
- Missing robots.txt or sitemap reference: -3
- Duplicate or near-duplicate content signals: -4

**Opportunities (deduct per issue):**
- Missing hreflang (if multilingual signals exist): -2
- No internal links: -3
- Poor heading hierarchy (skipped levels): -2
- Missing favicon: -1
- No lazy loading on below-fold images: -2

Floor the score at 0. Round to the nearest integer.

## Output Requirements
1. List all findings with severity, category, title, detail, fix, and impact
2. For each finding: title, explanation, specific fix with code if applicable

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

  buildUserPrompt: (input: Record<string, unknown>) => {
    const pageSpeed = input.pageSpeed as string | undefined;
    const perfSection = pageSpeed
      ? `\n\nReal Lighthouse/PageSpeed metrics for this URL (use these exact numbers when citing performance issues — do not invent values):\n${pageSpeed}\n`
      : "";
    return `
Audit this page: ${input.url}${perfSection}
Page HTML:
\`\`\`html
${(input.html as string).substring(0, 30000)}
\`\`\`
    `.trim();
  },

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "audit_report",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
