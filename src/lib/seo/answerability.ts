// Answerability: how usable a piece of content is as a direct answer for
// Google's answer features and assistants. Deterministic, 0 to 100, over
// plain text, Markdown or HTML. Five checks, the same ones the hosted-page
// readiness check runs (answer-readiness.ts), minus the ones that need a
// live site (structured data, robots.txt):
//
//   answer    a direct answer in the first two sentences          30
//   headings  at least two headings phrased as questions          20
//   entity    one plain sentence saying who / what / where        20
//   faq       three or more question-and-answer pairs             15
//   date      a visible date                                      15
//
// The content scorer blends this with the model's own answerability
// judgement (blendAnswerability), so a confident model cannot award a
// high mark to a page with no answer in it, and a dry checklist cannot
// sink a page that answers well in an unusual shape.

import { checkAnswerReadiness, hasVisibleDate, isQuestion } from "./answer-readiness";

export interface AnswerabilityCheck {
  id: "answer" | "headings" | "entity" | "faq" | "date";
  label: string;
  weight: number;
  passed: boolean;
  fix: string | null;
}

export interface AnswerabilityResult {
  /** 0..100 */
  score: number;
  checks: AnswerabilityCheck[];
  fixes: string[];
}

export interface AnswerabilityOptions {
  /** When known, the entity sentence must name the business. */
  businessName?: string | null;
}

const WEIGHTS: Record<AnswerabilityCheck["id"], number> = { answer: 30, headings: 20, entity: 20, faq: 15, date: 15 };
const LABELS: Record<AnswerabilityCheck["id"], string> = {
  answer: "A direct answer in the first two sentences",
  headings: "At least two headings are questions people ask",
  entity: "Says who you are, what you do and where",
  faq: "Three or more questions and answers",
  date: "Shows a date",
};
const FIXES: Record<AnswerabilityCheck["id"], string> = {
  answer: "Open with a two-sentence direct answer (about 20 to 60 words) before anything else.",
  headings: "Turn at least two headings into the questions people actually type.",
  entity: "Add one plain sentence near the top that says who you are, what you do and where.",
  faq: "Add at least three short questions and answers at the end.",
  date: "Show a date (published or updated) so readers and AI answers know it is current.",
};

const ENTITY_VERBS = /\b(is a|is an|are a|are an|is the|based in|serving|serves|helps|provides|offers|makes|builds|sells)\b/i;

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** Split prose into sentences on . ! ? followed by space or end. */
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function looksLikeHtml(content: string): boolean {
  return /<\s*(h[1-6]|p|div|article|section|body|html)\b[^>]*>/i.test(content);
}

/** Headings in Markdown ("## Why us?"), plain text (a short line ending in ?) or bold lines. */
export function extractTextHeadings(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const md = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (md) {
      out.push(md[1].trim());
      continue;
    }
    const bold = line.match(/^\*\*(.+?)\*\*$/);
    if (bold) {
      out.push(bold[1].trim());
      continue;
    }
    // A short standalone line ending in "?" reads as a heading in plain text.
    if (line.endsWith("?") && wordCount(line) <= 14 && !/[.!]\s/.test(line)) out.push(line);
  }
  return out;
}

/** The body text with Markdown headings and markers stripped. */
function proseOf(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((l) => !/^#{1,6}\s/.test(l.trim()))
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[*_`>]+/g, " ")
    .replace(/\[(.+?)\]\([^)]*\)/g, "$1");
}

function nameIn(haystack: string, name: string | null | undefined): boolean {
  const n = (name ?? "").toLowerCase().trim();
  if (!n) return true;
  const h = haystack.toLowerCase();
  if (h.includes(n)) return true;
  const head = n.split(/\s+/).slice(0, 2).join(" ");
  return head.length >= 4 && h.includes(head);
}

/** Question lines that are followed by an answer line: a Q&A pair. */
export function countFaqPairs(text: string): number {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^#{1,6}\s+|^\*\*|\*\*$|^[-*]\s+|^Q:\s*|^A:\s*/gi, "").trim())
    .filter(Boolean);
  let pairs = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    // "Yes." is a fine answer, so one word is enough; a line ending in "?" is the next question, not an answer.
    if (lines[i].endsWith("?") && wordCount(lines[i]) <= 20 && !lines[i + 1].endsWith("?") && wordCount(lines[i + 1]) >= 1) {
      pairs++;
      i++;
    }
  }
  return pairs;
}

function scoreText(content: string, opts: AnswerabilityOptions): AnswerabilityResult {
  const headings = extractTextHeadings(content);
  const prose = proseOf(content);
  const sentences = splitSentences(prose);

  // The answer: the first two sentences, as a reader meets them.
  const opening = sentences.slice(0, 2).join(" ");
  const openingWords = wordCount(opening);
  const answerOk = openingWords >= 12 && openingWords <= 80 && !isQuestion(sentences[0] ?? "");

  const questionHeadings = headings.filter(isQuestion).length;
  const headingsOk = questionHeadings >= 2;

  const top = prose.slice(0, 900);
  const entityOk = ENTITY_VERBS.test(top) && nameIn(top, opts.businessName);

  const faqOk = countFaqPairs(content) >= 3;
  const dateOk = hasVisibleDate(content);

  return assemble({ answer: answerOk, headings: headingsOk, entity: entityOk, faq: faqOk, date: dateOk });
}

function scoreHtml(content: string, opts: AnswerabilityOptions): AnswerabilityResult {
  // Reuse the hosted-page HTML checks; drop the two that need a live site.
  const r = checkAnswerReadiness({ kind: "html", html: content, businessName: opts.businessName ?? "" });
  const byId = new Map(r.checks.map((c) => [c.id, c.passed]));
  // The hosted-page entity check requires the business name; without one, any entity sentence counts.
  const entity = opts.businessName ? byId.get("entity") === true : ENTITY_VERBS.test(content.replace(/<[^>]+>/g, " ").slice(0, 1200));
  return assemble({
    answer: byId.get("answer") === true,
    headings: byId.get("questions") === true,
    entity,
    faq: byId.get("faq") === true,
    date: byId.get("date") === true,
  });
}

function assemble(passed: Record<AnswerabilityCheck["id"], boolean>): AnswerabilityResult {
  const checks = (Object.keys(WEIGHTS) as AnswerabilityCheck["id"][]).map((id) => ({
    id,
    label: LABELS[id],
    weight: WEIGHTS[id],
    passed: passed[id],
    fix: passed[id] ? null : FIXES[id],
  }));
  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  return { score, checks, fixes: checks.filter((c) => !c.passed).map((c) => c.fix as string) };
}

/** Score one piece of content (plain text, Markdown or HTML) for answerability, 0 to 100. */
export function scoreAnswerability(content: string, opts: AnswerabilityOptions = {}): AnswerabilityResult {
  const text = (content ?? "").trim();
  if (!text) return assemble({ answer: false, headings: false, entity: false, faq: false, date: false });
  return looksLikeHtml(text) ? scoreHtml(text, opts) : scoreText(text, opts);
}

/** Clamp a model-reported number into 0..100, or null when it is not a number. */
export function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * The answerability dimension the scorer returns: the average of the
 * model's judgement and the deterministic score. When the model gave no
 * usable number, the deterministic score stands on its own.
 */
export function blendAnswerability(modelScore: unknown, deterministicScore: number): number {
  const model = clampScore(modelScore);
  const det = Math.max(0, Math.min(100, Math.round(deterministicScore)));
  return model === null ? det : Math.round((model + det) / 2);
}
