// A paste-ready JSON-LD snippet for a site the audit found without (or
// with incomplete) structured data. Built from the project facts with the
// schema-generator builders: LocalBusiness for a place-bound business,
// Organization otherwise, plus FAQPage when the page has a FAQ. Pure.

import { extractHeadings } from "@/src/lib/crawl/html";
import type { FaqItem, ProjectFacts } from "@/src/lib/missing-pages/types";
import { mapAddressOf } from "@/src/lib/missing-pages/facts";
import { faqPage, graph, localBusiness, organization } from "./schema-generator";

export interface SchemaSnippetOptions {
  /** The audited page; its origin is the business url when the project has no website. */
  pageUrl: string;
  /** Questions and answers already on the page, when known. */
  faq?: FaqItem[] | null;
}

export interface SchemaSnippet {
  /** The <script type="application/ld+json"> block to paste into <head>. */
  html: string;
  /** The JSON-LD document on its own. */
  jsonLd: Record<string, unknown>;
  /** Which schema.org types the snippet declares, for the UI caption. */
  types: string[];
}

export type AuditFindingLike = { category?: unknown; title?: unknown; detail?: unknown; fix?: unknown };

const SCHEMA_WORDS = /\b(structured data|schema(\.org)?|json-?ld|rich results?|markup)\b/i;

/** True when a finding is about missing or incomplete structured data. */
export function isSchemaFinding(f: AuditFindingLike): boolean {
  if (f.category === "schema") return true;
  return SCHEMA_WORDS.test(`${f.title ?? ""} ${f.detail ?? ""}`);
}

export function auditNeedsSchemaSnippet(findings: unknown): boolean {
  return Array.isArray(findings) && findings.some((f) => f && typeof f === "object" && isSchemaFinding(f as AuditFindingLike));
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/$/, "");
  }
}

/**
 * Questions and answers already on a page: each h2/h3 ending in "?" and
 * the first paragraph after it. Empty when the page has fewer than three,
 * which is too few for a FAQPage that helps.
 */
export function extractFaqFromHtml(html: string): FaqItem[] {
  const out: FaqItem[] = [];
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>\s*(?:<[^h][^>]*>\s*)*?<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const q = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const a = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (q.endsWith("?") && a.length >= 10) out.push({ q, a: a.slice(0, 600) });
  }
  if (out.length >= 3) return out.slice(0, 10);
  // Question headings with no paragraph we could pair: still a FAQ, with answers to fill in.
  const questions = extractHeadings(html).filter((h) => h.trim().endsWith("?"));
  if (questions.length >= 3) return questions.slice(0, 10).map((q) => ({ q, a: "Your answer here." }));
  return [];
}

/** Build the snippet. `faq` is included only when it has at least one pair. */
export function buildSchemaSnippet(facts: ProjectFacts, opts: SchemaSnippetOptions): SchemaSnippet {
  const siteUrl = facts.websiteUrl?.replace(/\/$/, "") || originOf(opts.pageUrl);
  const description = facts.valueProposition ?? facts.description ?? undefined;
  const isLocal = facts.businessType === "local" || (!!facts.location && facts.businessType !== "saas");
  const address = isLocal
    ? facts.address || facts.city
      ? {
          streetAddress: facts.address ?? undefined,
          addressLocality: facts.city ?? facts.location?.split(",")[0]?.trim() ?? undefined,
          addressRegion: facts.location?.split(",").slice(1).join(",").trim() || undefined,
        }
      : facts.location
    : null;

  const entity = isLocal
    ? localBusiness({
        name: facts.name,
        url: siteUrl,
        description,
        phone: facts.phone,
        email: facts.email,
        address,
        areaServed: mapAddressOf({ address: null, city: facts.city ?? null, location: facts.location }),
        sameAs: facts.sameAs,
      })
    : organization({ name: facts.name, url: siteUrl, description, email: facts.email, sameAs: facts.sameAs });

  const nodes: Array<Record<string, unknown>> = [entity];
  const faq = (opts.faq ?? []).filter((f) => f.q.trim() && f.a.trim());
  if (faq.length > 0) nodes.push(faqPage(faq));

  const jsonLd = graph(nodes);
  const types = nodes.map((n) => String(n["@type"]));
  const html = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2).replace(/</g, "\\u003c")}\n</script>`;
  return { html, jsonLd, types };
}
