// "Ready for Google and AI answers": a deterministic check of one page.
//
// Works on our own page JSON (what the Missing Page agent writes) or on a
// crawled page's HTML. Seven checks, weighted to 100. Every failed check
// comes back as a fix written in plain words so the owner (or the agent)
// knows what to do.

import { extractH1, extractHeadings, extractJsonLd, extractVisibleText, textOf } from "@/src/lib/crawl/html";
import type { RobotsInfo } from "@/src/lib/crawl/robots";
import type { MissingPageContent } from "@/src/lib/missing-pages/types";

export interface ReadinessCheck {
  id: "entity" | "questions" | "answer" | "faq" | "date" | "schema" | "crawlers";
  label: string;
  weight: number;
  passed: boolean;
  fix: string | null;
}

export interface ReadinessResult {
  /** 0..100 */
  score: number;
  ready: boolean;
  checks: ReadinessCheck[];
  fixes: string[];
}

export const READY_THRESHOLD = 70;

export type ReadinessInput =
  | { kind: "page"; page: MissingPageContent; businessName: string; jsonLd?: unknown; robots?: RobotsInfo | null }
  | { kind: "html"; html: string; businessName: string; robots?: RobotsInfo | null };

const QUESTION_START = /^(who|what|when|where|why|how|which|can|do|does|is|are|should|will|could|would)\b/i;

export function isQuestion(text: string): boolean {
  const t = text.trim();
  return t.endsWith("?") || QUESTION_START.test(t);
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function sentences(s: string): number {
  return (s.match(/[.!?](\s|$)/g) ?? []).length;
}

const DATE_RE =
  /\b(20\d{2}-\d{2}-\d{2}|(?:\d{1,2}\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(?:\d{1,2},?\s+)?20\d{2})\b/i;

export function hasVisibleDate(text: string): boolean {
  return DATE_RE.test(text);
}

function nameIn(haystack: string, name: string): boolean {
  const h = haystack.toLowerCase();
  const n = name.toLowerCase().trim();
  if (!n) return false;
  if (h.includes(n)) return true;
  // A long legal name rarely appears verbatim; the first two words usually do.
  const head = n.split(/\s+/).slice(0, 2).join(" ");
  return head.length >= 4 && h.includes(head);
}

function* walk(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n);
  } else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    yield o;
    if (Array.isArray(o["@graph"])) yield* walk(o["@graph"]);
  }
}

/** True when any JSON-LD node's `name` matches the business name. */
export function jsonLdNamesBusiness(jsonLd: unknown, businessName: string): boolean {
  const wanted = businessName.toLowerCase().trim();
  if (!wanted) return false;
  for (const node of walk(jsonLd)) {
    if (typeof node.name !== "string") continue;
    const got = node.name.toLowerCase().trim();
    if (got === wanted) return true;
    // "Lekki Plumbers Ltd" vs "Lekki Plumbers": one contains the other.
    if (got.length >= 4 && (got.includes(wanted) || wanted.includes(got))) return true;
  }
  return false;
}

function crawlerCheck(robots: RobotsInfo | null | undefined): { passed: boolean; fix: string | null } {
  if (!robots || !robots.fetched) return { passed: true, fix: null };
  const blocked = Object.entries(robots.aiCrawlersBlocked)
    .filter(([, b]) => b)
    .map(([name]) => name);
  if (blocked.length === 0) return { passed: true, fix: null };
  return {
    passed: false,
    fix: `Your robots.txt shuts out ${blocked.join(", ")}. AI answers cannot quote a page they cannot read. Remove those Disallow lines.`,
  };
}

export function checkAnswerReadiness(input: ReadinessInput): ReadinessResult {
  const checks: ReadinessCheck[] = [];
  const name = input.businessName;

  if (input.kind === "page") {
    const p = input.page;
    const entityOk = wordCount(p.entitySentence) >= 5 && nameIn(p.entitySentence, name);
    checks.push({ id: "entity", label: "Says who you are, what you do and where", weight: 15, passed: entityOk, fix: entityOk ? null : `Add one plain sentence near the top that names ${name}, what it does and where.` });

    const questionHeadings = p.sections.map((s) => s.heading).filter(isQuestion).length;
    checks.push({ id: "questions", label: "At least two headings are questions people ask", weight: 15, passed: questionHeadings >= 2, fix: questionHeadings >= 2 ? null : "Turn at least two section headings into the questions people actually type." });

    const answerOk = wordCount(p.answer) >= 15 && wordCount(p.answer) <= 70 && sentences(p.answer) >= 1;
    checks.push({ id: "answer", label: "A direct answer sits right under the headline", weight: 15, passed: answerOk, fix: answerOk ? null : "Put a two-sentence direct answer (about 20 to 60 words) straight under the headline." });

    const faqOk = p.faq.filter((f) => f.q.trim() && f.a.trim()).length >= 3;
    checks.push({ id: "faq", label: "Three or more questions and answers", weight: 15, passed: faqOk, fix: faqOk ? null : "Add at least three short questions and answers at the bottom." });

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(p.updatedOn) && !Number.isNaN(Date.parse(p.updatedOn));
    checks.push({ id: "date", label: "Shows when it was last updated", weight: 10, passed: dateOk, fix: dateOk ? null : "Show an 'Updated on' date so readers and AI answers know it is current." });

    const schemaOk = input.jsonLd !== undefined && jsonLdNamesBusiness(input.jsonLd, name);
    checks.push({ id: "schema", label: "Machine-readable facts match the visible name", weight: 15, passed: schemaOk, fix: schemaOk ? null : `Add structured data (JSON-LD) whose name is exactly "${name}".` });
  } else {
    const html = input.html;
    const text = extractVisibleText(html, 20_000);
    const headings = extractHeadings(html);
    const h1 = extractH1(html);

    const opening = text.slice(0, 800);
    const entityOk = nameIn(opening, name) && /\b(is a|is an|are a|are an|based in|serving|serves|helps|provides|offers)\b/i.test(opening);
    checks.push({ id: "entity", label: "Says who you are, what you do and where", weight: 15, passed: entityOk, fix: entityOk ? null : `Add one plain sentence near the top that names ${name}, what it does and where.` });

    const questionHeadings = headings.filter((h) => h !== h1 && isQuestion(h)).length;
    checks.push({ id: "questions", label: "At least two headings are questions people ask", weight: 15, passed: questionHeadings >= 2, fix: questionHeadings >= 2 ? null : "Turn at least two section headings into the questions people actually type." });

    let afterH1 = "";
    if (h1) {
      const idx = text.indexOf(h1);
      afterH1 = idx >= 0 ? text.slice(idx + h1.length) : text;
    } else {
      afterH1 = text;
    }
    const first60 = afterH1.trim().split(/\s+/).slice(0, 60).join(" ");
    const answerOk = !!h1 && wordCount(first60) >= 20 && sentences(first60) >= 1;
    checks.push({ id: "answer", label: "A direct answer sits right under the headline", weight: 15, passed: answerOk, fix: answerOk ? null : "Put a two-sentence direct answer straight under the main headline, before anything else." });

    const faqCount = Math.max(
      (html.match(/<summary\b/gi) ?? []).length,
      (html.match(/"@type"\s*:\s*"Question"/g) ?? []).length,
      headings.filter((h) => h.trim().endsWith("?")).length
    );
    checks.push({ id: "faq", label: "Three or more questions and answers", weight: 15, passed: faqCount >= 3, fix: faqCount >= 3 ? null : "Add at least three short questions and answers at the bottom." });

    const timeTag = /<time\b[^>]*datetime=["'][^"']+["']/i.test(html);
    const dateOk = timeTag || hasVisibleDate(text);
    checks.push({ id: "date", label: "Shows when it was last updated", weight: 10, passed: dateOk, fix: dateOk ? null : "Show an 'Updated on' date so readers and AI answers know it is current." });

    const blocks = extractJsonLd(html);
    const schemaOk = blocks.length > 0 && blocks.some((b) => jsonLdNamesBusiness(b, name));
    checks.push({
      id: "schema",
      label: "Machine-readable facts match the visible name",
      weight: 15,
      passed: schemaOk,
      fix: schemaOk ? null : blocks.length === 0 ? `Add structured data (JSON-LD) naming "${name}" so Google and AI answers can read the facts.` : `Your structured data names something other than "${name}". Make the names match.`,
    });
  }

  const crawlers = crawlerCheck(input.robots);
  checks.push({ id: "crawlers", label: "AI answer engines are allowed to read the site", weight: 15, ...crawlers });

  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  return {
    score,
    ready: score >= READY_THRESHOLD,
    checks,
    fixes: checks.filter((c) => !c.passed && c.fix).map((c) => c.fix as string),
  };
}

/** Plain-text excerpt helper for callers that only have HTML. */
export function visibleTextOf(html: string): string {
  return textOf(extractVisibleText(html, 5000));
}
