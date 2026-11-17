// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mapEmbedUrl, renderPageHtml } from "./html";
import { renderLlmsTxt } from "./llms";
import { HostedPageView } from "./render";
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

describe("renderPageHtml with a map", () => {
  it("adds a lazy keyless Google Maps embed and the address as text on local pages", () => {
    const html = renderPageHtml(page, { mapAddress: "12 Admiralty Way, Lekki, Lagos", businessName: "Lekki Plumbers" });
    expect(html).toContain('<iframe src="https://www.google.com/maps?q=12%20Admiralty%20Way%2C%20Lekki%2C%20Lagos&amp;output=embed"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("<address>Lekki Plumbers, 12 Admiralty Way, Lekki, Lagos</address>");
    expect(mapEmbedUrl("Lekki & Co")).toBe("https://www.google.com/maps?q=Lekki%20%26%20Co&output=embed");
    expect(renderPageHtml(page)).not.toContain("<iframe");
  });
});

describe("HostedPageView", () => {
  const project = { name: "Lekki Plumbers", location: "Lekki, Lagos", phone: "0800 000 0000", websiteUrl: null };

  it("shows the map with a text address on a local page with an address", () => {
    const html = renderToStaticMarkup(<HostedPageView page={page} project={{ ...project, address: "12 Admiralty Way", city: "Lekki" }} template="local" />);
    expect(html).toContain("https://www.google.com/maps?q=12%20Admiralty%20Way%2C%20Lekki%2C%20Lagos&amp;output=embed");
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("Lekki Plumbers, 12 Admiralty Way, Lekki, Lagos");
  });

  it("shows the address as text but no map when only the broad place is known, and nothing on service pages", () => {
    const local = renderToStaticMarkup(<HostedPageView page={page} project={project} template="local" />);
    expect(local).not.toContain("<iframe");
    expect(local).toContain("Lekki Plumbers, Lekki, Lagos");
    const service = renderToStaticMarkup(<HostedPageView page={page} project={{ ...project, address: "12 Admiralty Way" }} template="service" />);
    expect(service).not.toContain("Where to find us");
  });
});

describe("renderLlmsTxt", () => {
  it("lists the business facts and every published page with one line each", () => {
    const facts = {
      name: "Lekki Plumbers",
      valueProposition: "Same-day plumbing in Lekki",
      description: null,
      services: ["emergency plumbing", "drain cleaning"],
      location: "Lekki, Lagos",
      address: "12 Admiralty Way",
      city: "Lekki",
      phone: "0800 000 0000",
      email: "hello@lekki.ng",
      websiteUrl: null,
      bookingUrl: "https://book.lekki.ng",
      reviewUrl: null,
      businessType: "local" as const,
    };
    const txt = renderLlmsTxt("lekki", facts, [
      { slug: "emergency-plumber-in-lekki", title: "Emergency plumber in Lekki", meta_description: null, page },
      { slug: "drain-cleaning", title: "Drain [cleaning]", meta_description: "Blocked drains cleared the same day.", page: { ...page, updatedOn: "2026-11-01" } },
    ]);
    expect(txt.startsWith("# Lekki Plumbers\n\n> Same-day plumbing in Lekki\n")).toBe(true);
    expect(txt).toContain("- What we do: emergency plumbing, drain cleaning");
    expect(txt).toContain("- Where: 12 Admiralty Way, Lekki, Lagos");
    expect(txt).toContain("- Phone: 0800 000 0000");
    expect(txt).toContain("- Book: https://book.lekki.ng");
    expect(txt).toContain("- [Emergency plumber in Lekki](https://lekki.conduikt.site/emergency-plumber-in-lekki): Same-day emergency plumbing in Lekki. (updated 2026-10-26)");
    expect(txt).toContain("- [Drain cleaning](https://lekki.conduikt.site/drain-cleaning): Blocked drains cleared the same day. (updated 2026-11-01)");
    expect(txt).toContain("[Sitemap](https://lekki.conduikt.site/sitemap.xml)");
  });
});
