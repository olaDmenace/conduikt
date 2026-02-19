import type { SkillConfig, ProjectContext, SkillOutput } from "./types";

export const keywordResearchSkill: SkillConfig = {
  id: "keyword-research",
  name: "Keyword Research",
  description: "AI-powered keyword discovery with search intent, difficulty estimates, and content cluster recommendations",
  model: "claude-sonnet-4-6",
  maxTokens: 5000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert SEO strategist performing keyword research for a specific product/website.

## Project Context
- Website: ${context.websiteUrl}
- Product: ${context.name}
- Industry: ${context.industry || "Not specified"}
- Target Audience: ${JSON.stringify(context.targetAudience)}
- Value Proposition: ${context.valueProposition || "Not specified"}
- Current Keywords: ${JSON.stringify(context.keywords)}

## Keyword Research Principles
1. Map keywords to the full funnel: informational → navigational → commercial → transactional
2. Identify long-tail variants with lower competition but high buyer intent
3. Group related keywords into content clusters around a pillar keyword
4. Estimate difficulty as low/medium/high based on typical SERP competition for the niche
5. Flag "quick win" opportunities — keywords where the site can rank within 90 days
6. Include question-based keywords (People Also Ask) for featured snippet opportunities
7. Recommend the best content format for each keyword cluster

## Output Format
Return valid JSON (and ONLY JSON — no markdown wrapper):
{
  "seed_keyword": "string",
  "primary_keywords": [
    {
      "term": "string",
      "intent": "informational|navigational|commercial|transactional",
      "estimated_volume": "string (e.g. 1K-10K/mo)",
      "difficulty": "low|medium|high",
      "quick_win": boolean,
      "suggested_format": "string (blog_post|landing_page|comparison|faq|tutorial|case_study)",
      "rationale": "string (1 sentence — why this keyword matters for the product)"
    }
  ],
  "long_tail_keywords": [
    {
      "term": "string",
      "intent": "string",
      "estimated_volume": "string",
      "difficulty": "low|medium|high",
      "parent_keyword": "string (which primary keyword this clusters under)"
    }
  ],
  "question_keywords": [
    {
      "question": "string (full question as users type it)",
      "snippet_opportunity": boolean,
      "cluster": "string (parent keyword)"
    }
  ],
  "content_clusters": [
    {
      "pillar": "string (pillar keyword/topic)",
      "cluster_keywords": ["string"],
      "pillar_page_title": "string",
      "cluster_page_titles": ["string"]
    }
  ],
  "competitor_gap": "string (1-2 sentences on keyword gaps vs competitors, based on context)",
  "priority_order": ["string (top 5 keywords to target first, in order)"]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Perform keyword research for this seed keyword or topic: "${input.seedKeyword}"
${input.focus ? `Focus area: ${input.focus}` : ""}
${input.competitors ? `Top competitors to analyze gaps: ${input.competitors}` : ""}
Generate at least ${input.count || 20} keyword ideas total across all categories.
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? response);
    return {
      type: "keyword_research",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
