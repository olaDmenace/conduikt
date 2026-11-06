// @vitest-environment node
import { describe, expect, it } from "vitest";
import { findGaps, matchQuery, pageMatchScore, stem, tokenize } from "./gaps";
import type { CrawledPage } from "@/src/lib/crawl/site-crawler";

const pages: CrawledPage[] = [
  { url: "https://lekki.ng/", title: "Lekki Plumbers | Home", h1: "Plumbing in Lekki", metaDescription: null, textExcerpt: "We fix pipes.", headings: ["Plumbing in Lekki", "Our services"] },
  { url: "https://lekki.ng/services/drain-cleaning", title: "Drain cleaning in Lekki", h1: "Drain cleaning", metaDescription: null, textExcerpt: "Blocked drains cleared the same day.", headings: ["Drain cleaning", "How it works"] },
  { url: "https://lekki.ng/about", title: "About us", h1: "About Lekki Plumbers", metaDescription: null, textExcerpt: "Founded in 2019.", headings: ["About Lekki Plumbers"] },
];

describe("tokenize / stem", () => {
  it("stems lightly and drops intent stopwords", () => {
    expect(stem("plumbers")).toBe("plumb");
    expect(stem("cleaning")).toBe("clean");
    expect(stem("prices")).toBe("pric");
    expect(tokenize("drain cleaning near me")).toEqual(["drain", "clean"]);
  });
});

describe("matchQuery", () => {
  it("finds a strong match when the page is about the query", () => {
    const m = matchQuery("drain cleaning near me", pages);
    expect(m.matchedUrl).toBe("https://lekki.ng/services/drain-cleaning");
    expect(m.strength).toBe("strong");
  });

  it("returns no match when nothing on the site covers it", () => {
    const m = matchQuery("water heater installation cost", pages);
    expect(m.matchedUrl).toBeNull();
    expect(m.strength).toBe("none");
  });

  it("returns a weak match for partial coverage", () => {
    const m = matchQuery("emergency plumbing lekki", pages);
    expect(m.strength).toBe("weak");
    expect(m.matchedUrl).toBe("https://lekki.ng/");
  });

  it("scores from headings and text lower than from the title", () => {
    const p = pages[1];
    expect(pageMatchScore("drain cleaning", p)).toBe(1);
    expect(pageMatchScore("same day drains", p)).toBeGreaterThan(0);
    expect(pageMatchScore("same day drains", p)).toBeLessThan(1);
  });
});

describe("findGaps", () => {
  it("leaves the weak band alone without the flag", async () => {
    const out = await findGaps(["emergency plumbing lekki"], pages);
    expect(out[0].strength).toBe("weak");
  });

  it("lets a disambiguator promote or demote weak matches", async () => {
    const out = await findGaps(["emergency plumbing lekki", "drain cleaning near me", "water heater cost"], pages, {
      useClaude: true,
      disambiguate: async (items) => Object.fromEntries(items.map((i) => [i.query, false])),
    });
    expect(out[0].strength).toBe("none");
    expect(out[0].matchedUrl).toBeNull();
    expect(out[1].strength).toBe("strong");
    expect(out[2].strength).toBe("none");
  });
});
