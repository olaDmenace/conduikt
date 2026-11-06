// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderPageHtml } from "./html";
import { targetFromConnections } from "./publish";
import { hostedPagePath, hostedPageUrl, pickTemplate, slugify } from "./templates";
import { checkAnswerReadiness } from "@/src/lib/seo/answer-readiness";
import type { MissingPageContent } from "@/src/lib/missing-pages/types";

const page: MissingPageContent = {
  title: "Emergency plumber in Lekki",
  metaDescription: "Same-day emergency plumbing in Lekki.",
  h1: "Emergency plumber in Lekki",
  entitySentence: "Lekki Plumbers is a plumbing company serving homes in Lekki, Lagos.",
  answer: "Yes, Lekki Plumbers sends a plumber the same day for burst pipes and leaks anywhere in Lekki. Call before noon and we usually arrive within three hours.",
  sections: [
    { heading: "What counts as an emergency?", body: "A burst pipe.\n\nOr sewage backing up." },
    { heading: "How fast can you come?", body: "Within three hours." },
  ],
  faq: [
    { q: "Do you work weekends?", a: "Yes." },
    { q: "Do you quote first?", a: "Yes." },
    { q: "Do you fix heaters?", a: "Yes & more." },
  ],
  cta: { label: "Call for a quote", href: "tel:+2348000000000" },
  updatedOn: "2026-10-26",
};

describe("renderPageHtml", () => {
  it("serialises answer-first HTML with FAQ, date and JSON-LD, escaped", () => {
    const html = renderPageHtml(page, { jsonLd: { "@type": "LocalBusiness", name: "Lekki Plumbers" } });
    expect(html.startsWith("<h1>Emergency plumber in Lekki</h1>")).toBe(true);
    expect(html).toContain("<p><strong>Yes, Lekki Plumbers");
    expect(html).toContain("<details><summary>Do you work weekends?</summary>");
    expect(html).toContain("Yes &amp; more.");
    expect(html).toContain('<time datetime="2026-10-26">26 October 2026</time>');
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain("<p>A burst pipe.</p>\n<p>Or sewage backing up.</p>");
    expect(renderPageHtml(page, { omitH1: true })).not.toContain("<h1>");
  });

  it("produces HTML the readiness check scores as ready", () => {
    const html = renderPageHtml(page, { jsonLd: { "@type": "LocalBusiness", name: "Lekki Plumbers" } });
    const r = checkAnswerReadiness({ kind: "html", html: `<html><body>${html}</body></html>`, businessName: "Lekki Plumbers" });
    expect(r.ready).toBe(true);
  });
});

describe("templates", () => {
  it("picks local for local businesses, launch for launch phrases, service otherwise", () => {
    expect(pickTemplate("local", "plumber near me")).toBe("local");
    expect(pickTemplate("saas", "acme pricing")).toBe("service");
    expect(pickTemplate("saas", "announcing acme 2.0")).toBe("launch");
  });

  it("slugify and urls", () => {
    expect(slugify("Emergency Plumbing near me!")).toBe("emergency-plumbing-near-me");
    expect(slugify("Lekki  Plumbers Ltd.", 40)).toBe("lekki-plumbers-ltd");
    expect(hostedPageUrl("lekki", "x")).toBe("https://lekki.conduikt.site/x");
    expect(hostedPagePath("lekki", "x")).toBe("/p/lekki/x");
    expect(hostedPagePath("lekki")).toBe("/p/lekki");
  });
});

describe("targetFromConnections", () => {
  it("prefers WordPress, then hosted, then nothing", () => {
    const hosted = { id: "1", project_id: "p", kind: "hosted" as const, site_slug: "lekki", base_url: null, username: null, secret_encrypted: null };
    const wp = { id: "2", project_id: "p", kind: "wordpress" as const, site_slug: null, base_url: "https://blog.example.com", username: "olu", secret_encrypted: "plain-legacy-secret" };
    expect(targetFromConnections([hosted])).toEqual({ kind: "hosted", siteSlug: "lekki" });
    expect(targetFromConnections([hosted, wp])).toEqual({ kind: "wordpress", connection: { baseUrl: "https://blog.example.com", username: "olu", appPassword: "plain-legacy-secret" } });
    expect(targetFromConnections([])).toBeNull();
  });
});
