// A plain HTML serializer for the page JSON: what we send to WordPress and
// what the readiness check can re-read. No React, no classes; the host's
// theme styles it.

import type { MissingPageContent } from "@/src/lib/missing-pages/types";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export interface RenderHtmlOptions {
  /** Included as <script type="application/ld+json"> when given. */
  jsonLd?: unknown;
  /** Skip the h1 (WordPress prints the title itself). */
  omitH1?: boolean;
}

/** Body HTML for the page: h1, entity line, answer, sections, FAQ, CTA, date. */
export function renderPageHtml(page: MissingPageContent, opts: RenderHtmlOptions = {}): string {
  const parts: string[] = [];
  if (!opts.omitH1) parts.push(`<h1>${escapeHtml(page.h1)}</h1>`);
  parts.push(`<p><strong>${escapeHtml(page.answer)}</strong></p>`);
  if (page.entitySentence) parts.push(`<p>${escapeHtml(page.entitySentence)}</p>`);
  for (const s of page.sections) {
    parts.push(`<h2>${escapeHtml(s.heading)}</h2>`);
    parts.push(paragraphs(s.body));
  }
  if (page.faq.length > 0) {
    parts.push(`<h2>Questions people ask</h2>`);
    for (const f of page.faq) {
      parts.push(`<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`);
    }
  }
  parts.push(`<p><a href="${escapeHtml(page.cta.href)}">${escapeHtml(page.cta.label)}</a></p>`);
  parts.push(`<p><small>Updated on <time datetime="${escapeHtml(page.updatedOn)}">${escapeHtml(formatDate(page.updatedOn))}</time></small></p>`);
  if (opts.jsonLd !== undefined) {
    parts.push(`<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, "\\u003c")}</script>`);
  }
  return parts.join("\n");
}
