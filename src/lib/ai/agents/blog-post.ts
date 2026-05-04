import type { SkillConfig, ProjectContext, SkillOutput } from "./types";
import { parseJsonResponse } from "../parse-json";

export const blogPostSkill: SkillConfig = {
  id: "blog-post",
  name: "Blog Post",
  description: "SEO-optimized long-form blog posts with meta tags, structure, and social promotion snippets",
  model: "claude-sonnet-4-6",
  // 1500-word blog posts plus meta + social_promotion + conclusion run
  // ~6500-7500 output tokens. 12000 keeps headroom for outliers.
  maxTokens: 12000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert content marketer and SEO writer creating a blog post for a specific product/company.

## Project Context
- Website: ${context.websiteUrl}
- Product: ${context.name}
- Target Audience: ${JSON.stringify(context.targetAudience)}
- Value Proposition: ${context.valueProposition || "Not specified"}
- Brand Voice: ${JSON.stringify(context.brandVoice)}
- Competitors: ${JSON.stringify(context.competitors)}

## SEO Writing Rules
1. Meta title: 50-60 characters, include primary keyword near start
2. Meta description: 150-160 characters, include primary keyword, compelling reason to click
3. H2/H3 hierarchy: Logical structure, include related keywords naturally
4. First paragraph: Include primary keyword within first 100 words
5. Word count: Match the requested length (default 1200-1500 words)
6. Readability: Short paragraphs (2-3 sentences), clear language
7. Include a clear CTA at the end that relates to the product

## Content Structure
- Hook intro: Open with a problem, stat, or bold claim — not "In this post..."
- H2 sections: 4-6 sections with clear value per section
- Actionable takeaways: Every section should have something the reader can do
- Conclusion + CTA: Summarise, then natural CTA to the product
${context.performanceContext || ""}

## Rules
- Do NOT use emojis anywhere in the output unless the user's prompt explicitly requests them.

## Output Format
Return valid JSON (and ONLY JSON — no markdown code fences, no explanation before or after):
{
  "meta_title": "string (50-60 chars)",
  "meta_description": "string (150-160 chars)",
  "slug": "string (url-friendly, lowercase, hyphens)",
  "featured_image_query": "string (2-4 word search term for a relevant stock photo)",
  "content_markdown": "string (full blog post in markdown — use # for H1, ## for H2, ### for H3)",
  "word_count": number,
  "reading_time_minutes": number,
  "social_promotion": {
    "x_post": "string (max 280 chars, hook from the article)",
    "linkedin_post": "string (400-600 chars, educational take on the topic)",
    "email_subject": "string (compelling subject line for promoting this post)"
  }
}
  `.trim(),

  buildUserPrompt: (input: Record<string, unknown>) => `
Write a blog post about: ${input.topic}
${input.targetKeyword ? `Target keyword: ${input.targetKeyword}` : ""}
Target word count: ${input.wordCount || 1500}
Tone: ${input.tone || "Use brand voice from project context"}
${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}
  `.trim(),

  parseResponse: (response: string): SkillOutput => {
    const parsed = parseJsonResponse(response);
    return {
      type: "blog_post",
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
