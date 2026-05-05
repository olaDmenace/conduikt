import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const emailSequenceSkill: SkillConfig = {
  id: "email-sequence",
  name: "Email Sequence",
  description: "Automated email sequence generation",
  model: "claude-sonnet-4-6",
  // 5 full HTML emails with table-based markup, inline-styled brand
  // accents, and table-of-contents-style sections regularly hit 5500-6500
  // output tokens. The previous 6000 cap pushed Claude to truncation
  // exactly when the JSON closing braces would be emitted. 12000 gives
  // comfortable headroom; tokens are billed on actual usage, not the cap.
  maxTokens: 12000,

  buildSystemPrompt: (context: ProjectContext) => {
    const accent = context.brandPrimaryColor ?? "#D4956A";
    return `
You are an email marketing expert who creates high-performing automated email sequences.

## Project Context
- Product: ${context.name}
- Website: ${context.websiteUrl}
- Value proposition: ${context.valueProposition || "Not specified"}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Brand voice: ${JSON.stringify(context.brandVoice)}
- Brand accent color: ${accent}

## Email Principles
1. Subject lines: specific > clever. Curiosity gap or clear benefit. ≤ 60 chars.
2. Preview text: extends the subject line, doesn't repeat it. ≤ 100 chars.
3. First line: personal, not corporate. Reference why they're getting this.
4. Body: one idea per email. Clear hierarchy. Scannable.
5. CTA: one primary CTA per email. Button + text link fallback.
6. Brevity wins. People skim — they don't read.
${context.performanceContext || ""}

## CRITICAL: Length budget per email
Each body_html MUST be **≤ 1500 characters total** (including all HTML tags).
That maps to roughly 100-150 words of actual copy. Treat this as a hard cap.

This isn't a stylistic preference — going over it causes generations to
truncate before the JSON closes, breaking the entire sequence. Better
to ship a 5-email sequence with punchy 100-word emails than 5 over-padded
emails that never make it out of the AI.

To stay under the cap:
- 2 short paragraphs MAX, not 4-5.
- One clear CTA — no nested feature lists, no "what Pro unlocks" bullet
  blocks, no testimonial pull-quotes (save those for the landing page).
- Skip section dividers, headers, and decorative table cells. Plain
  paragraphs styled inline are fine — modern email clients render them.
- No comments, no nested tables, no hidden preview-text divs.

## CRITICAL: Timing semantics
\`delay_hours\` is the gap **from the previous step**, NOT the cumulative
time since enrollment. The runner schedules each step relative to when
the previous step fired.

- Step 1 MUST have \`delay_hours: 0\` (sends immediately on enrollment).
- Step 2's delay_hours = how long to wait AFTER step 1.
- Step 3's delay_hours = how long to wait AFTER step 2.

Example for a 5-email welcome sequence over ~10 days:
  step 1: delay_hours: 0    (immediate)
  step 2: delay_hours: 48   (2 days after step 1 = day 2)
  step 3: delay_hours: 48   (2 days after step 2 = day 4)
  step 4: delay_hours: 72   (3 days after step 3 = day 7)
  step 5: delay_hours: 72   (3 days after step 4 = day 10)

Do NOT cumulate (e.g. 0, 48, 96, 168, 240) — that's interpreted as
multi-week gaps and the sequence becomes too sparse.

## Brand styling rules for body_html
Apply the brand accent color (${accent}) where it lands naturally:
- CTA button background: ${accent} with white text
- Inline link colors in the body: ${accent}
Keep the rest of the email neutral — clean dark text on white background.
Use inline styles only (email clients strip <style> blocks).

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.
- HTML must be email-client-safe: inline styles only, no external CSS, no
  <script>, no <style> blocks.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "sequence_name": "string",
  "type": "welcome | nurture | onboarding | re_engagement | launch",
  "trigger": "string (what starts this sequence)",
  "emails": [
    {
      "step": number (1-indexed),
      "delay_hours": number (gap from previous step; step 1 must be 0),
      "subject_line": "string (≤ 60 chars)",
      "preview_text": "string (≤ 100 chars)",
      "body_html": "string (≤ 1500 chars, simple HTML, accent color ${accent} on CTA + links)",
      "cta_text": "string",
      "cta_url": "string (placeholder)",
      "goal": "string (one sentence — what this email aims to achieve)"
    }
  ],
  "exit_conditions": ["string"]
}
    `.trim();
  },

  buildUserPrompt: (input: Record<string, unknown>) => {
    // Universal hard cap — even at the 1500-char body cap, ~10 emails is
    // the safe ceiling for the 12K maxTokens budget. Anything higher
    // risks truncation. The default stays at 5 so typical welcome/
    // onboarding flows are unaffected.
    const requested = Number(input.count) || 5;
    const safeCount = Math.min(10, Math.max(1, Math.floor(requested)));
    return `
Create a ${input.type || "welcome"} email sequence.

Number of emails: ${safeCount}
Goal: ${input.goal || "Onboard new users and drive activation"}
Trigger event: ${input.trigger || "User signs up"}
Additional context: ${input.context || "None"}
  `.trim();
  },

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "email_sequence",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
