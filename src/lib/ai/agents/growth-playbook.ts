import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const growthPlaybookSkill: SkillConfig = {
  id: "growth-playbook",
  name: "Growth Playbook",
  description: "90-day AI-generated growth plan with prioritised actions across SEO, content, social, and conversion",
  model: "claude-sonnet-4-6",
  maxTokens: 24000,

  buildSystemPrompt: (context: ProjectContext) => `
You are a senior growth strategist creating a 90-day growth playbook for a specific product.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Description: ${context.description || "Not specified"}
- Value Proposition: ${context.valueProposition || "Not specified"}
- Target Audience: ${JSON.stringify(context.targetAudience)}
- Brand Voice: ${JSON.stringify(context.brandVoice)}
- Competitors: ${JSON.stringify(context.competitors)}
- Current Keywords: ${JSON.stringify(context.keywords)}

## Playbook Principles
1. Every action must be specific, achievable, and tied to a measurable outcome
2. Prioritise quick wins (< 2 weeks) first to build momentum
3. Balance across channels: SEO, content, social, email, conversion
4. Each action should include the exact tool or page in Conduikt to execute it
5. Actions should build on each other — sequenced for maximum compound effect
6. Include success metrics for each phase so progress can be tracked

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "title": "string (e.g. '90-Day Growth Playbook for [Product]')",
  "executive_summary": "string (3-4 sentences — current situation, biggest opportunity, approach)",
  "phases": [
    {
      "phase": "number (1, 2, or 3)",
      "name": "string (e.g. 'Foundation & Quick Wins')",
      "timeline": "string (e.g. 'Days 1–30')",
      "theme": "string (1 sentence strategic focus)",
      "actions": [
        {
          "id": "string (e.g. 'P1-A1')",
          "title": "string (action title)",
          "category": "string (seo|content|social|email|conversion|analytics)",
          "priority": "string (critical|high|medium)",
          "effort": "string (low|medium|high)",
          "impact": "string (low|medium|high)",
          "description": "string (2-3 sentences — what to do and why)",
          "conduikt_tool": "string (which Conduikt feature executes this: 'SEO Audit' | 'Content Studio' | 'Blog Generator' | 'Keyword Research' | 'Social Content' | 'Email Sequence' | 'Competitor Analysis' | 'Analytics')",
          "conduikt_route": "string (path segment: 'audit' | 'content' | 'blog' | 'keywords' | 'content' | 'content' | 'content' | 'analytics')",
          "success_metric": "string (how to measure completion/success)"
        }
      ],
      "phase_kpi": "string (primary KPI for this phase)"
    }
  ],
  "growth_levers": [
    {
      "lever": "string (e.g. 'SEO Authority')",
      "current_state": "string (assessment based on context)",
      "target_state": "string (where it should be in 90 days)",
      "key_actions": ["string"]
    }
  ],
  "week_1_checklist": ["string (5-7 immediate actions for day 1 of the playbook)"]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Create a 90-day growth playbook.

Current situation: ${input.currentSituation || "New project looking to establish growth foundations"}
Primary goal: ${input.primaryGoal || "Increase organic traffic and convert visitors to users"}
Biggest challenge: ${input.challenge || "Not specified"}
${input.auditScore ? `Latest SEO audit score: ${input.auditScore}/100` : ""}
${input.assetCount ? `Content assets created so far: ${input.assetCount}` : ""}
${input.focus ? `Strategic focus areas: ${input.focus}` : ""}

Generate a comprehensive, actionable 90-day playbook with 5-7 actions per phase.
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "growth_playbook",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
