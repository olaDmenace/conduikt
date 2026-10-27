// The "Editor agent" step: deterministic. A page must pass this before it
// can be published. Trivial gaps are fixed in place (missing date, missing
// entity sentence) so the agent's small slips don't block a good page.

import { checkAnswerReadiness, type ReadinessResult } from "@/src/lib/seo/answer-readiness";
import { pageJsonLd } from "@/src/lib/seo/schema-generator";
import type { RobotsInfo } from "@/src/lib/crawl/robots";
import type { HostedTemplate, MissingPageContent, ProjectFacts } from "./types";

export interface ReviewInput {
  page: MissingPageContent;
  facts: ProjectFacts;
  robots?: RobotsInfo | null;
  template?: HostedTemplate;
  pageUrl?: string;
  siteUrl?: string;
  serviceName?: string | null;
  today?: string;
}

export interface ReviewResult extends ReadinessResult {
  /** The page with trivial fixes applied. */
  page: MissingPageContent;
  applied: string[];
}

/** One plain sentence from the facts: who, what, where. */
export function defaultEntitySentence(facts: ProjectFacts): string {
  const what = facts.services[0] ?? facts.category ?? facts.valueProposition ?? "what it does";
  const where = facts.location ? ` in ${facts.location}` : "";
  if (facts.businessType === "local") return `${facts.name} is a ${what} business${where}.`;
  const who = facts.audience[0] ? ` for ${facts.audience[0]}` : "";
  return `${facts.name} is ${/^[aeiou]/i.test(what) ? "an" : "a"} ${what}${who}${where}.`;
}

export function reviewPage(input: ReviewInput): ReviewResult {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const applied: string[] = [];
  let page: MissingPageContent = { ...input.page };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(page.updatedOn)) {
    page = { ...page, updatedOn: today };
    applied.push("Added today's date as the updated-on line.");
  }
  const nameInEntity = page.entitySentence.toLowerCase().includes(input.facts.name.toLowerCase().split(/\s+/).slice(0, 2).join(" "));
  if (page.entitySentence.trim().split(/\s+/).length < 5 || !nameInEntity) {
    page = { ...page, entitySentence: defaultEntitySentence(input.facts) };
    applied.push("Added a sentence that says who you are, what you do and where.");
  }

  const siteUrl = input.siteUrl ?? input.facts.websiteUrl ?? "https://conduikt.site";
  const pageUrl = input.pageUrl ?? siteUrl;
  const jsonLd = pageJsonLd(page, input.facts, { pageUrl, siteUrl, serviceName: input.serviceName ?? null, template: input.template });

  const readiness = checkAnswerReadiness({ kind: "page", page, businessName: input.facts.name, jsonLd, robots: input.robots ?? null });
  return { ...readiness, page, applied };
}
