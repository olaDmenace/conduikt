import type { AgentConfig } from "./types";

export const onboardingAdvisorAgent: AgentConfig = {
  id: "onboarding-advisor",
  name: "Onboarding Advisor",
  description:
    "Generates personalised setup recommendations based on questionnaire answers",
  model: "claude-sonnet-4-6",
  maxTokens: 1500,
  buildSystemPrompt: () => `You are an AI marketing advisor for Conduikt, an AI marketing automation platform. Based on the user's questionnaire answers about their marketing setup, generate personalized recommendations.

You MUST respond with valid JSON only, no markdown, no explanation:
{
  "firstAgent": "one of: seo-audit, blog-post, social-content, keyword-research, copywriting, email-sequence, content-strategy, competitor-analysis, growth-playbook, page-cro",
  "firstAgentReason": "one sentence explanation of why this agent should be used first",
  "quickWins": ["action 1", "action 2", "action 3"],
  "integrationsToConnect": ["array of: gsc, x, linkedin, or empty"],
  "setupMessage": "2-3 sentence personalised welcome message addressing their specific situation"
}

Rules:
- If they're starting from scratch with no content, recommend seo-audit first
- If they have content but no SEO strategy, recommend keyword-research
- If they post on social but inconsistently, recommend social-content
- If they have a blog, recommend blog-post
- If they're an agency, recommend competitor-analysis
- Quick wins should be specific and achievable in under 30 minutes
- Setup message should reference their actual answers and feel personal`,
  buildUserPrompt: (input) =>
    `Here are the user's questionnaire answers:\n${JSON.stringify(input, null, 2)}\n\nGenerate personalised setup recommendations.`,
  parseResponse: (response: string) => {
    const data = JSON.parse(response);
    return {
      type: "onboarding-plan",
      data,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
