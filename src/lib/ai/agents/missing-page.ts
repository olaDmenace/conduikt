import type { AgentConfig, ProjectContext, AgentOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

// Missing Page agent: writes ONE page for ONE search phrase. Answer first,
// plain words, only the facts it was given. For an 'update' it receives the
// existing page's text and returns the revised page plus what changed.

export const missingPageAgent: AgentConfig = {
  id: "missing-page",
  name: "Missing Pages",
  description: "Finds the searches you have no page for, writes the page, puts it live",
  model: "claude-sonnet-4-6",
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => `
You write one web page that directly answers one search people make. The page is for the business below. It must read like a knowledgeable person answering a neighbour, not like marketing.

## The business (the only facts you may use)
- Name: ${context.name}
- Website: ${context.websiteUrl || "not given"}
- What it does: ${context.description || context.valueProposition || "not given"}
- Industry or category: ${context.industry || "not given"}
- Who it is for: ${context.targetAudience ? JSON.stringify(context.targetAudience) : "not given"}
- How it sounds: ${context.brandVoice ? JSON.stringify(context.brandVoice) : "plain and warm"}

## Rules
1. Answer first. Under the headline comes a two-sentence direct answer to the search, then the detail.
2. Plain words. Short sentences. No jargon, no acronyms the reader did not type.
3. Use only the facts above and in the request. Never invent prices, statistics, awards, years in business, staff counts, certifications or guarantees. If a fact is not given, say what the reader can do instead ("call for a quote").
4. The entity sentence says who the business is, what it does and where, in one plain sentence that includes the business name.
5. For a place-bound business, mention the place naturally in the headline, the answer and at least one section. Do not stuff it.
6. Every section heading is either a question people ask or a plain noun phrase. At least three of them are questions.
7. 500 to 900 words in total across answer, sections and FAQ.
8. No emojis. No exclamation marks. No "we're passionate about". No superlatives you cannot back.
9. The FAQ has 3 to 5 short questions with one- or two-sentence answers.
10. The call to action is one short verb phrase the reader would say ("Call for a quote", "See pricing") and an href from the facts (the website, a tel: link if a phone was given, or "#contact").
11. updatedOn is today's date as YYYY-MM-DD, given in the request.
12. For an update: keep what the existing page already did well, rewrite what it lacked, and list exactly three bullets saying what changed.

## Output
Return ONLY valid JSON (no markdown fences, no text before or after):
{
  "title": "string, under 60 characters, includes the search phrase naturally",
  "metaDescription": "string, 120 to 155 characters",
  "h1": "string, under 70 characters",
  "entitySentence": "string",
  "answer": "string, two sentences",
  "sections": [{ "heading": "string", "body": "string, 2 to 4 short paragraphs separated by \\n\\n" }],
  "faq": [{ "q": "string", "a": "string" }],
  "cta": { "label": "string", "href": "string" },
  "updatedOn": "YYYY-MM-DD",
  "changes": ["string", "string", "string"]
}
Omit "changes" for a new page.
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => {
    const query = String(input.query ?? "");
    const kind = input.kind === "update" ? "update" : "new";
    const today = String(input.today ?? new Date().toISOString().slice(0, 10));
    const facts = input.facts as Record<string, unknown> | undefined;
    const lines = [
      `Search phrase to answer: "${query}"`,
      `Kind: ${kind === "update" ? "update an existing page" : "new page"}`,
      `Today's date: ${today}`,
    ];
    if (facts) {
      const f = facts as { services?: string[]; location?: string | null; phone?: string | null; email?: string | null; competitors?: string[]; category?: string | null };
      if (f.services?.length) lines.push(`Services offered: ${f.services.join(", ")}`);
      if (f.location) lines.push(`Place: ${f.location}`);
      if (f.phone) lines.push(`Phone: ${f.phone}`);
      if (f.email) lines.push(`Email: ${f.email}`);
      if (f.category) lines.push(`Category: ${f.category}`);
      if (f.competitors?.length) lines.push(`Competitors the reader may compare with: ${f.competitors.join(", ")} (state only what the business itself does; do not make claims about competitors)`);
    }
    if (kind === "update" && input.existingPage) {
      const existing = input.existingPage as { url?: string; title?: string | null; text?: string };
      lines.push("", `Existing page to revise: ${existing.url ?? ""}`, `Existing title: ${existing.title ?? ""}`, "Existing page text:", "```", String(existing.text ?? "").slice(0, 6000), "```");
    }
    return lines.join("\n");
  },

  parseResponse: (response: string): AgentOutput => ({
    type: "missing_page",
    data: parseJsonResponse(response),
    usage: { inputTokens: 0, outputTokens: 0 },
  }),
};
