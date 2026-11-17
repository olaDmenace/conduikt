// @vitest-environment node
import { describe, expect, it } from "vitest";
import { auditNeedsSchemaSnippet, buildSchemaSnippet, extractFaqFromHtml, isSchemaFinding } from "./schema-snippet";
import type { ProjectFacts } from "@/src/lib/missing-pages/types";

const local: ProjectFacts = {
  id: "p1",
  name: "Lekki Plumbers",
  websiteUrl: "https://lekkiplumbers.ng/",
  businessType: "local",
  services: ["emergency plumbing"],
  location: "Lekki, Lagos",
  description: null,
  valueProposition: "Same-day plumbing in Lekki",
  audience: [],
  competitors: [],
  category: "plumber",
  phone: "+234 800 000 0000",
  email: "hello@lekkiplumbers.ng",
  sameAs: ["https://instagram.com/lekkiplumbers"],
  address: "12 Admiralty Way",
  city: "Lekki",
};

const saas: ProjectFacts = { ...local, name: "Acme", websiteUrl: null, businessType: "saas", location: null, address: null, city: null, phone: null };

describe("buildSchemaSnippet", () => {
  it("builds a LocalBusiness with a postal address for a place-bound business", () => {
    const s = buildSchemaSnippet(local, { pageUrl: "https://lekkiplumbers.ng/services" });
    expect(s.types).toEqual(["LocalBusiness"]);
    const node = (s.jsonLd["@graph"] as Array<Record<string, unknown>>)[0];
    expect(node.name).toBe("Lekki Plumbers");
    expect(node.url).toBe("https://lekkiplumbers.ng");
    expect(node.telephone).toBe("+234 800 000 0000");
    expect(node.address).toEqual({ "@type": "PostalAddress", streetAddress: "12 Admiralty Way", addressLocality: "Lekki", addressRegion: "Lagos" });
    expect(s.html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(s.html.endsWith("</script>")).toBe(true);
    expect(JSON.parse(s.html.replace(/^<script[^>]*>|<\/script>$/g, ""))).toEqual(s.jsonLd);
  });

  it("builds an Organization from the page origin when the project has no website, plus FAQPage when there is a FAQ", () => {
    const s = buildSchemaSnippet(saas, { pageUrl: "https://acme.example/pricing", faq: [{ q: "Is there a free plan?", a: "Yes." }] });
    expect(s.types).toEqual(["Organization", "FAQPage"]);
    const [org, faq] = s.jsonLd["@graph"] as Array<Record<string, unknown>>;
    expect(org.url).toBe("https://acme.example");
    expect((faq.mainEntity as unknown[]).length).toBe(1);
  });

  it("escapes a closing script tag inside the facts", () => {
    const s = buildSchemaSnippet({ ...saas, valueProposition: "</script><script>alert(1)</script>" }, { pageUrl: "https://acme.example" });
    expect(s.html.split("</script>").length).toBe(2);
  });
});

describe("finding detection and FAQ extraction", () => {
  it("spots structured-data findings by category or wording", () => {
    expect(isSchemaFinding({ category: "schema", title: "x" })).toBe(true);
    expect(isSchemaFinding({ category: "technical", title: "Missing structured data" })).toBe(true);
    expect(isSchemaFinding({ category: "content", title: "No JSON-LD found", detail: "" })).toBe(true);
    expect(isSchemaFinding({ category: "meta", title: "Title too long" })).toBe(false);
    expect(auditNeedsSchemaSnippet([{ category: "meta" }, { category: "schema" }])).toBe(true);
    expect(auditNeedsSchemaSnippet("nope")).toBe(false);
  });

  it("pairs question headings with the paragraph after them", () => {
    const html = `<h2>Do you work weekends?</h2><p>Yes, seven days a week.</p><h2>Do you quote first?</h2><p>Always, in writing.</p><h3>Do you fix heaters?</h3><p>Yes, all brands.</p><h2>Our area</h2><p>Lekki.</p>`;
    expect(extractFaqFromHtml(html)).toEqual([
      { q: "Do you work weekends?", a: "Yes, seven days a week." },
      { q: "Do you quote first?", a: "Always, in writing." },
      { q: "Do you fix heaters?", a: "Yes, all brands." },
    ]);
    expect(extractFaqFromHtml("<h2>Only one?</h2><p>Yes indeed it is.</p>")).toEqual([]);
  });
});
