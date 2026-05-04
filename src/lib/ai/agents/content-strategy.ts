import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const contentStrategySkill: SkillConfig = {
  id: "content-strategy",
  name: "Content Strategy",
  description: "Strategic content planning with topics, formats, and calendar recommendations",
  model: "claude-sonnet-4-6",
  // Pillars × content_pieces × calendar entries fan out fast on bigger
  // strategies; 8000 gives headroom for 90-day plans without truncation.
  maxTokens: 8000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert content strategist who builds data-driven content plans for SaaS and digital products.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Description: ${context.description || "Not specified"}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Brand voice: ${JSON.stringify(context.brandVoice)}
- Keywords: ${JSON.stringify(context.keywords)}
- Competitors: ${JSON.stringify(context.competitors)}

## Strategic Principles
1. Map content to the buyer journey: awareness → consideration → decision → retention
2. Every piece of content should have a clear intent (educate, convert, retain, amplify)
3. Prioritize topics by search volume, competition gap, and alignment with product strengths
4. Recommend a mix of formats: long-form, short-form, social, email, video scripts
5. Include distribution strategy — not just what to create, but where and how to promote it
6. Build content clusters around pillar topics to strengthen topical authority
7. Tie content goals to measurable KPIs

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "strategy_name": "string",
  "time_horizon": "string (e.g. 30 days, 90 days)",
  "pillars": [
    {
      "topic": "string (pillar topic)",
      "intent": "string (awareness|consideration|decision|retention)",
      "search_opportunity": "string (high|medium|low)",
      "content_pieces": [
        {
          "title": "string",
          "format": "string (blog|social|email|video_script|landing_page|case_study)",
          "channel": "string (website|x|linkedin|email|youtube)",
          "priority": "string (high|medium|low)",
          "brief": "string (2-3 sentence content brief)",
          "target_keyword": "string or null",
          "estimated_impact": "string"
        }
      ]
    }
  ],
  "content_calendar": [
    {
      "week": "number",
      "pieces": ["string (title references from above)"],
      "theme": "string"
    }
  ],
  "kpis": ["string (measurable goals)"],
  "quick_wins": ["string (3 content pieces to publish first)"]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Create a content strategy.

Goal: ${input.goal || "Drive organic traffic and convert visitors to users"}
Time horizon: ${input.timeHorizon || "30 days"}
Focus areas: ${input.focus || "Not specified — suggest based on project context"}
Content types preferred: ${input.contentTypes || "All formats"}
Additional context: ${input.context || "None"}
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "content_strategy",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
