import type { SkillConfig, ProjectContext, SkillOutput } from "./types";

export const competitorAnalysisSkill: SkillConfig = {
  id: "competitor-analysis",
  name: "Competitor Analysis",
  description: "Deep competitive analysis with positioning gaps and tactical opportunities",
  model: "claude-sonnet-4-6",
  maxTokens: 5000,

  buildSystemPrompt: (context: ProjectContext) => `
You are a competitive intelligence analyst specializing in SaaS and digital product markets.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Description: ${context.description || "Not specified"}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Known competitors: ${JSON.stringify(context.competitors)}
- Keywords: ${JSON.stringify(context.keywords)}

## Analysis Framework
1. Evaluate competitors across: positioning, messaging, features, pricing, content strategy, SEO presence
2. Identify gaps where the product can differentiate — not just what competitors do, but what they miss
3. Analyze competitor content strategies: what topics they rank for, what formats they use, where they're absent
4. Look for messaging weaknesses: vague value props, generic CTAs, unaddressed pain points
5. Suggest specific, actionable tactics — not general advice
6. Rank opportunities by effort vs. impact
7. Be honest about competitor strengths — credibility comes from objectivity

## Output Format
Return valid JSON:
{
  "analysis_name": "string",
  "competitors": [
    {
      "name": "string",
      "url": "string",
      "positioning": "string (how they position themselves)",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "messaging_analysis": "string (quality of their copy and value prop)",
      "content_strategy": "string (what content they produce and where)",
      "seo_presence": "string (estimated organic strength)",
      "pricing_model": "string"
    }
  ],
  "positioning_gaps": [
    {
      "gap": "string (unaddressed market need or angle)",
      "opportunity": "string (how to exploit this gap)",
      "impact": "string (high|medium|low)",
      "effort": "string (high|medium|low)"
    }
  ],
  "content_opportunities": [
    {
      "topic": "string",
      "rationale": "string (why competitors are weak here)",
      "suggested_format": "string",
      "priority": "string (high|medium|low)"
    }
  ],
  "messaging_recommendations": [
    {
      "area": "string (headline|value_prop|cta|social_proof|differentiation)",
      "current_issue": "string",
      "recommendation": "string",
      "example": "string"
    }
  ],
  "quick_wins": ["string (3 actions to take immediately)"]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Run a competitive analysis.

Competitors to analyze: ${input.competitors || "Use known competitors from project context, or suggest the top 3 in this space"}
Focus areas: ${input.focus || "All — positioning, content, messaging, SEO"}
Specific questions: ${input.questions || "None — provide comprehensive analysis"}
Additional context: ${input.context || "None"}
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? response);
    return {
      type: "competitor_analysis",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
