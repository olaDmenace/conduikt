// @vitest-environment node
import { describe, expect, it } from "vitest";
import { article, faqPage, localBusiness, organization, pageJsonLd, service, webPage } from "./schema-generator";
import type { MissingPageContent, ProjectFacts } from "@/src/lib/missing-pages/types";

const facts: ProjectFacts = {
  id: "p1",
  name: "Lekki Plumbers",
  websiteUrl: "https://lekkiplumbers.ng",
  businessType: "local",
  services: ["emergency plumbing"],
  location: "Lekki, Lagos",
  description: null,
  valueProposition: "Same-day plumbing in Lekki",
  audience: ["homeowners"],
  competitors: [],
  category: "plumber",
  phone: "+234 800 000 0000",
  sameAs: ["https://instagram.com/lekkiplumbers"],
};

const page: MissingPageContent = {
  title: "Emergency plumber near me in Lekki",
  metaDescription: "Same-day emergency plumbing in Lekki.",
  h1: "Emergency plumber in Lekki",
  entitySentence: "Lekki Plumbers is a plumbing company in Lekki, Lagos.",
  answer: "Call us. We come the same day.",
  sections: [{ heading: "What counts as an emergency?", body: "A burst pipe." }],
  faq: [
    { q: "Do you work weekends?", a: "Yes." },
    { q: "How fast?", a: "Within hours." },
    { q: "Do you quote first?", a: "Yes." },
  ],
  cta: { label: "Call now", href: "tel:+2348000000000" },
  updatedOn: "2026-10-26",
};

describe("schema builders", () => {
  it("localBusiness carries name, phone, address and sameAs", () => {
    const lb = localBusiness({ name: "A", url: "https://a.com/", phone: "1", address: "Lagos", sameAs: ["https://x.com/a"] });
    expect(lb["@type"]).toBe("LocalBusiness");
    expect(lb["@id"]).toBe("https://a.com/#business");
    expect(lb.telephone).toBe("1");
    expect(lb.address).toEqual({ "@type": "PostalAddress", addressLocality: "Lagos" });
    expect(lb.sameAs).toEqual(["https://x.com/a"]);
    expect("email" in lb).toBe(false);
  });

  it("organization, service, faqPage, article, webPage have the expected types", () => {
    expect(organization({ name: "A", url: "https://a.com" })["@type"]).toBe("Organization");
    const s = service({ name: "Plumbing", provider: { "@id": "x" }, areaServed: "Lagos" });
    expect(s["@type"]).toBe("Service");
    expect(s.provider).toEqual({ "@id": "x" });
    const f = faqPage(page.faq) as { "@type": string; mainEntity: Array<{ "@type": string; acceptedAnswer: { text: string } }> };
    expect(f["@type"]).toBe("FAQPage");
    expect(f.mainEntity).toHaveLength(3);
    expect(f.mainEntity[0]["@type"]).toBe("Question");
    expect(f.mainEntity[0].acceptedAnswer.text).toBe("Yes.");
    expect(article({ headline: "H", url: "https://a.com/x", author: "A", dateModified: "2026-01-01" })["@type"]).toBe("Article");
    const wp = webPage({ name: "N", url: "https://a.com/x", breadcrumbs: [{ name: "Home", url: "https://a.com" }] });
    expect(wp[0]["@type"]).toBe("WebPage");
    expect(wp[1]["@type"]).toBe("BreadcrumbList");
  });

  it("pageJsonLd composes LocalBusiness + Service + WebPage + FAQPage for a local business", () => {
    const doc = pageJsonLd(page, facts, { pageUrl: "https://lekki.conduikt.site/emergency-plumber", siteUrl: "https://lekki.conduikt.site", serviceName: "emergency plumbing" });
    expect(doc["@context"]).toBe("https://schema.org");
    const types = doc["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(["LocalBusiness", "Service", "WebPage", "BreadcrumbList", "FAQPage"]);
    const biz = doc["@graph"][0] as { name: string; telephone: string };
    expect(biz.name).toBe("Lekki Plumbers");
    expect(biz.telephone).toBe("+234 800 000 0000");
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });

  it("pageJsonLd uses Organization for saas and adds Article on launch pages", () => {
    const saas = { ...facts, businessType: "saas" as const, location: null };
    const doc = pageJsonLd(page, saas, { pageUrl: "https://a.conduikt.site/x", siteUrl: "https://a.conduikt.site", template: "launch" });
    const types = doc["@graph"].map((n) => n["@type"]);
    expect(types[0]).toBe("Organization");
    expect(types).toContain("Article");
    expect(types).not.toContain("Service");
  });
});
