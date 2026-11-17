import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { modelFor } from "../model-routing";
import { parseJsonResponse } from "../parse-json";
import { buildSchemaSnippet, extractFaqFromHtml, isSchemaFinding, type AuditFindingLike } from "@/src/lib/seo/schema-snippet";
import type { ProjectFacts } from "@/src/lib/missing-pages/types";

export interface AuditReportLike {
  score?: unknown;
  findings?: unknown;
  summary?: unknown;
  schema_snippet?: string;
}

/**
 * When the audit flags missing or incomplete structured data, attach a
 * paste-ready JSON-LD snippet built from the project facts: on the report
 * as `schema_snippet` and on the first structured-data finding (so the
 * saved `findings` JSON carries it to the Site Audit screen). Pure; the
 * audit route calls it after parseResponse. Returns the same object.
 */
export function attachSchemaSnippet<T extends AuditReportLike>(report: T, facts: ProjectFacts, opts: { pageUrl: string; html?: string | null }): T & { schema_snippet?: string } {
  const out = report as T & { schema_snippet?: string };
  if (!Array.isArray(out.findings)) return out;
  const findings = out.findings as Array<AuditFindingLike & { schema_snippet?: string }>;
  const target = findings.find((f) => f && typeof f === "object" && isSchemaFinding(f));
  if (!target) return out;
  const faq = opts.html ? extractFaqFromHtml(opts.html) : [];
  const snippet = buildSchemaSnippet(facts, { pageUrl: opts.pageUrl, faq });
  out.schema_snippet = snippet.html;
  target.schema_snippet = snippet.html;
  return out;
}

export const seoAuditSkill: SkillConfig = {
  id: "seo-audit",
  name: "SEO Audit",
  description: "Comprehensive technical and on-page SEO analysis",
  model: modelFor("generate"),
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

**Answer readiness (how usable the page is as a direct answer for Google's answer features and assistants such as ChatGPT; deduct per issue, category "answer"):**
- No plain sentence saying who the business is, what it does and where it works: -4
- The first paragraph under the H1 does not answer the page's main question directly: -3
- No headings phrased as questions people ask, and no FAQ section: -3
- No visible date (published or updated): -2
- Structured data present but its name or type contradicts the visible content: -3

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
      "category": "meta" | "content" | "technical" | "performance" | "schema" | "answer",
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
