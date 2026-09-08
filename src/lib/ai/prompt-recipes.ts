/**
 * Prompt recipe library — one-click marketing-framework scaffolds.
 *
 * Each recipe is a starting point the user edits, not a rigid template.
 * The bracketed placeholders [LIKE_THIS] are what the user replaces.
 *
 * Why: eliminate blank-prompt paralysis (UX audit finding on Nielsen
 * heuristic #6 · Recognition Rather Than Recall). Instead of staring at
 * an empty textarea trying to remember what a good prompt looks like,
 * the user picks a proven framework and fills in the blanks.
 *
 * Kept intentionally small (6 recipes) to avoid choice paralysis. Add
 * more only when we have analytics on which of these actually get used.
 * The `usageHint` field is what shows in the picker card next to the
 * name — one honest sentence about when the framework earns its keep.
 */

export interface PromptRecipe {
  id: string;
  name: string;
  /** One-sentence description used as the card subtitle in the picker. */
  usageHint: string;
  /** The scaffolded prompt inserted into the textarea when selected. */
  template: string;
}

export const PROMPT_RECIPES: PromptRecipe[] = [
  {
    id: "aida",
    name: "AIDA",
    usageHint:
      "Attention → Interest → Desire → Action. The classic. Best for landing-page copy and ad hooks.",
    template: `Write a [FORMAT — blog intro / X post / landing hero] using the AIDA framework:

Attention: Open with [SPECIFIC PROVOCATIVE HOOK — a stat, a contradiction, a question the reader has been avoiding]
Interest: Explain why [PROBLEM] costs [AUDIENCE] time, money, or reputation
Desire: Show how [PRODUCT / SOLUTION] transforms the outcome — concrete, not aspirational
Action: End with [SPECIFIC CTA — one thing, one verb]

Target audience: [WHO — role, stage, pain]
Tone: [direct / warm / technical]
`,
  },
  {
    id: "pas",
    name: "PAS",
    usageHint:
      "Problem → Agitate → Solution. Short-form dynamite. Best for cold outreach, emails, and X posts.",
    template: `Write a [FORMAT — cold email / X post / sales letter] using PAS:

Problem: State the [SPECIFIC PROBLEM] the audience faces — not the category, the exact pain
Agitate: Detail the cost of not solving it (money lost, hours burnt, credibility damaged)
Solution: Present [OUR SOLUTION] as the direct fix — one sentence, no hedging

Target audience: [WHO]
Length: [short: <100 words / medium: 100-250 / long: 250+]
`,
  },
  {
    id: "bab",
    name: "Before → After → Bridge",
    usageHint:
      "Paint the two worlds and the crossing between them. Best for case studies and testimonial framing.",
    template: `Write a [FORMAT] using Before-After-Bridge:

Before: Paint the reader's current painful state — specifics only, no vague adjectives
After: Paint their state after [TRANSFORMATION] — again, specifics: what they see, do, feel differently
Bridge: [OUR SOLUTION] is how they get from before to after. One sentence explaining the mechanism.

Voice: honest, not hype. Understatement beats overpromise.
`,
  },
  {
    id: "contrarian-hook",
    name: "Contrarian Hook",
    usageHint:
      "Start with a counter-intuitive claim. Best for build-in-public posts and thought-leadership pieces.",
    template: `Write a [FORMAT] that opens with a counter-intuitive claim:

Popular belief: [WHAT MOST PEOPLE ASSUME]
The uncomfortable truth: [OUR CONTRARIAN TAKE — must be defensible, not edgy for its own sake]
Why the crowd is wrong: 2-3 specific reasons, each grounded in evidence or first-principles logic
What to do instead: [ACTIONABLE ADVICE — one clear next step]

Voice: direct, confident, no hedging. Reader should either agree or disagree — never shrug.
`,
  },
  {
    id: "feature-benefit-emotion",
    name: "Feature → Benefit → Emotion",
    usageHint:
      "Translate mechanics into felt outcomes. Best for product-page copy and social proof.",
    template: `Write a [FORMAT] that ladders features up to emotional outcomes:

For each of the top 2-3 features:
  Feature: [WHAT WE BUILT]
  Benefit: [WHAT IT LETS THE USER DO]
  Emotion: [HOW IT MAKES THEM FEEL — the outcome, not the mechanic]

The emotion column is the payload. Features are commodities; emotional outcomes are the moat.
Do not list more than 3 features — pick the ones that actually matter to [AUDIENCE].
`,
  },
  {
    id: "data-backed",
    name: "Data-Backed Claim",
    usageHint:
      "Build the piece around a specific verifiable stat. Best for authority content and PR angles.",
    template: `Write a [FORMAT] built around a specific, verifiable statistic:

Hook: [THE NUMBER + WHY IT'S SURPRISING] — lead with it
Context: [WHAT IT MEASURES + WHY IT MATTERS TO THE AUDIENCE]
Implication: [WHAT THE READER SHOULD DO WITH THIS INFO — the practical answer]
Source: [WHERE THE DATA COMES FROM — link if possible, always cite]

Prefer an honest small number with clear methodology over an impressive big one you can't defend.
`,
  },
];

/** Look up a recipe by id. Returns undefined if not found. */
export function getRecipe(id: string): PromptRecipe | undefined {
  return PROMPT_RECIPES.find((r) => r.id === id);
}
