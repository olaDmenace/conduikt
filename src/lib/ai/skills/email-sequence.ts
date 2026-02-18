import type { SkillConfig, ProjectContext, SkillOutput } from "./types";

export const emailSequenceSkill: SkillConfig = {
  id: "email-sequence",
  name: "Email Sequence",
  description: "Automated email sequence generation",
  model: "claude-sonnet-4-6",
  maxTokens: 6000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an email marketing expert who creates high-performing automated email sequences.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Brand voice: ${JSON.stringify(context.brandVoice)}

## Email Principles
1. Subject lines: specific > clever. Curiosity gap or clear benefit
2. Preview text: extends the subject line, doesn't repeat it
3. First line: personal, not corporate. Reference why they're getting this
4. Body: one idea per email. Clear hierarchy. Scannable
5. CTA: one primary CTA per email. Button + text link fallback
6. Timing: space emails appropriately (not too aggressive)

## Output Format
Return valid JSON:
{
  "sequence_name": "string",
  "type": "welcome | nurture | onboarding | re_engagement | launch",
  "trigger": "string (what starts this sequence)",
  "emails": [
    {
      "step": number,
      "delay_hours": number,
      "subject_line": "string",
      "preview_text": "string",
      "body_html": "string (simple HTML email body)",
      "cta_text": "string",
      "cta_url": "string (placeholder)",
      "goal": "string (what this email aims to achieve)"
    }
  ],
  "exit_conditions": ["string"]
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Create a ${input.type || "welcome"} email sequence.

Number of emails: ${input.count || 5}
Goal: ${input.goal || "Onboard new users and drive activation"}
Trigger event: ${input.trigger || "User signs up"}
Additional context: ${input.context || "None"}
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? response);
    return {
      type: "email_sequence",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
