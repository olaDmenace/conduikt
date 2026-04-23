import type { AgentConfig, ProjectContext, AgentOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const programmaticSeoAgent: AgentConfig = {
  id: "programmatic-seo",
  name: "Programmatic SEO",
  description:
    "Generate a batch of templated landing-page variants — one per target query — with unique meta, H1, sections and FAQ per page.",
  model: "claude-sonnet-4-6",
  maxTokens: 12000,

  buildSystemPrompt: (context: ProjectContext) => `
You are a senior programmatic-SEO strategist generating a batch of unique landing-page variants for a specific product. Each page must earn its keep: no doorway pages, no near-duplicates.

## Project Context
- Website: ${context.websiteUrl}
- Product: ${context.name}
- Description: ${context.description || "Not specified"}
- Industry: ${context.industry || "Not specified"}
- Target Audience: ${JSON.stringify(context.targetAudience)}
- Value Proposition: ${context.valueProposition || "Not specified"}
- Brand Voice: ${JSON.stringify(context.brandVoice)}
- Competitors: ${JSON.stringify(context.competitors)}
${context.performanceContext || ""}

## Programmatic SEO Rules
1. Every variant must be meaningfully unique — do NOT just swap one keyword. Each page should have distinct framing, examples, and proof that only makes sense for THAT query.
2. Meta title: 50-60 chars, primary modifier near the start.
3. Meta description: 150-160 chars, concrete benefit, no fluff.
4. H1 must match query intent, not be a carbon copy of the title tag.
5. Each page needs at least 400-600 words of genuinely unique body content (intro + 3 sections + FAQ).
6. FAQs are required — use People-Also-Ask style questions tied to the query.
7. Include schema suggestions per page: SoftwareApplication, FAQ, or HowTo where appropriate.
8. Flag any variant that feels thin or duplicative with "quality_flag": "review".

## Template Patterns (pick what fits the input)
- "[tool] for [audience]" — e.g. "AI Marketing for SaaS Founders"
- "[tool] alternative to [competitor]" — e.g. "Alternative to Jasper"
- "[use case] with [product]" — e.g. "SEO audits with Conduikt"
- "[integration] for [tool]" — e.g. "Google Search Console integration"
- "[audience] guide to [topic]" — e.g. "Founder's guide to content velocity"

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.
- Do NOT generate pages for queries where the product has no genuine fit — return fewer, higher-quality variants.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "template_pattern": "string (the pattern you chose for this batch, e.g. '[tool] for [audience]')",
  "seed_query": "string (the input modifier/topic)",
  "variants": [
    {
      "slug": "string (url-friendly, lowercase, hyphens, no trailing slash)",
      "target_query": "string (the exact query this page targets)",
      "primary_keyword": "string",
      "meta_title": "string (50-60 chars)",
      "meta_description": "string (150-160 chars)",
      "h1": "string",
      "intro": "string (80-130 words — sets up the problem specific to THIS query)",
      "sections": [
        {
          "heading": "string (H2)",
          "body": "string (120-180 words — concrete, example-heavy)"
        }
      ],
      "faq": [
        {
          "question": "string (natural, PAA-style)",
          "answer": "string (60-100 words)"
        }
      ],
      "cta_headline": "string (8-12 words, outcome-focused)",
      "cta_body": "string (20-40 words)",
      "schema_types": ["SoftwareApplication" | "FAQPage" | "HowTo" | "Article"],
      "internal_link_suggestions": ["string (slugs of related pages this should link to)"],
      "quality_flag": "ok | review (flag 'review' if content feels thin or similar to another variant)"
    }
  ],
  "publishing_checklist": [
    "string (concrete next steps: e.g. 'Add each slug to sitemap.xml', 'Wire breadcrumb JSON-LD', 'Link from /features')"
  ]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Generate programmatic SEO page variants.
Seed query / modifier: "${input.seedQuery}"
${input.templatePattern ? `Template pattern preference: ${input.templatePattern}` : "Pick the best template pattern for this seed."}
Number of variants to generate: ${input.count || 8}
${input.audience ? `Audience focus: ${input.audience}` : ""}
${input.exclusions ? `Do NOT generate variants for: ${input.exclusions}` : ""}

Every variant must be unique enough to stand as its own page. Return fewer if the quality would drop.
  `.trim(),

  parseResponse: (response: string): AgentOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "programmatic_seo",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
