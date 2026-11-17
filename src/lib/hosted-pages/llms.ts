// llms.txt for one hosted site: a plain-text index AI answer engines can
// read in one request. Business facts first, then every published page
// as "title: url" with one line about it. Pure: hand it rows, get text.
//
// Format follows llmstxt.org: an H1, a blockquote summary, H2 sections
// with "- [title](url): one line" entries.

import type { MissingPageContent, ProjectFacts } from "@/src/lib/missing-pages/types";
import { mapAddressOf } from "@/src/lib/missing-pages/facts";
import { hostedPageUrl, hostedSiteUrl } from "./templates";

export interface LlmsPageRow {
  slug: string;
  title: string;
  meta_description: string | null;
  page: Pick<MissingPageContent, "answer" | "metaDescription" | "updatedOn">;
}

export type LlmsFacts = Pick<ProjectFacts, "name" | "valueProposition" | "description" | "services" | "location" | "address" | "city" | "phone" | "email" | "websiteUrl" | "bookingUrl" | "reviewUrl" | "businessType">;

function oneLine(s: string | null | undefined, max = 160): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Markdown link text: no brackets, no newlines. */
function linkText(s: string): string {
  return oneLine(s, 120).replace(/[[\]]/g, "");
}

export function renderLlmsTxt(site: string, facts: LlmsFacts, pages: LlmsPageRow[]): string {
  const siteUrl = hostedSiteUrl(site);
  const lines: string[] = [`# ${facts.name}`, ""];

  const summary = oneLine(facts.valueProposition ?? facts.description, 240);
  if (summary) lines.push(`> ${summary}`, "");

  lines.push("## About");
  const what = facts.services.length > 0 ? facts.services.join(", ") : null;
  if (what) lines.push(`- What we do: ${oneLine(what, 200)}`);
  const where = mapAddressOf(facts);
  if (where) lines.push(`- Where: ${where}`);
  if (facts.phone) lines.push(`- Phone: ${facts.phone}`);
  if (facts.email) lines.push(`- Email: ${facts.email}`);
  if (facts.websiteUrl) lines.push(`- Website: ${facts.websiteUrl}`);
  if (facts.bookingUrl) lines.push(`- Book: ${facts.bookingUrl}`);
  if (facts.reviewUrl) lines.push(`- Reviews: ${facts.reviewUrl}`);
  lines.push(`- This site: ${siteUrl}`, "");

  lines.push("## Pages");
  if (pages.length === 0) {
    lines.push("- No pages published yet.");
  }
  for (const p of pages) {
    const about = oneLine(p.meta_description ?? p.page.metaDescription ?? p.page.answer);
    const dated = p.page.updatedOn ? ` (updated ${p.page.updatedOn})` : "";
    lines.push(`- [${linkText(p.title)}](${hostedPageUrl(site, p.slug)}): ${about}${dated}`);
  }
  lines.push("", "## Optional", `- [Sitemap](${siteUrl}/sitemap.xml): every page on this site`, "");
  return lines.join("\n");
}
