// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkAnswerReadiness, isQuestion, jsonLdNamesBusiness } from "./answer-readiness";
import type { MissingPageContent } from "@/src/lib/missing-pages/types";
import type { RobotsInfo } from "@/src/lib/crawl/robots";

const goodPage: MissingPageContent = {
  title: "Emergency plumber in Lekki | Lekki Plumbers",
  metaDescription: "Same-day emergency plumbing in Lekki, Lagos.",
  h1: "Emergency plumber in Lekki",
  entitySentence: "Lekki Plumbers is a licensed plumbing company serving homes and offices in Lekki, Lagos.",
  answer: "Yes, Lekki Plumbers sends a plumber the same day for burst pipes, blocked drains and leaks anywhere in Lekki. Call before noon and we usually arrive within three hours.",
  sections: [
    { heading: "What counts as a plumbing emergency?", body: "A burst pipe, sewage backing up, or no water at all." },
    { heading: "How fast can you come?", body: "Usually within three hours." },
    { heading: "Our service area", body: "Lekki Phase 1, Ikate, Chevron, Ajah." },
  ],
  faq: [
    { q: "Do you work weekends?", a: "Yes, seven days a week." },
    { q: "Do you quote before starting?", a: "Yes, always." },
    { q: "Do you fix water heaters?", a: "Yes." },
  ],
  cta: { label: "Call now", href: "tel:+2348000000000" },
  updatedOn: "2026-10-26",
};

const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "LocalBusiness", name: "Lekki Plumbers" }] };

const openRobots: RobotsInfo = { fetched: true, aiCrawlersBlocked: { GPTBot: false, ClaudeBot: false, PerplexityBot: false, "Google-Extended": false }, disallowForUs: [] };

describe("checkAnswerReadiness (page JSON)", () => {
  it("passes a good page", () => {
    const r = checkAnswerReadiness({ kind: "page", page: goodPage, businessName: "Lekki Plumbers", jsonLd, robots: openRobots });
    expect(r.score).toBe(100);
    expect(r.ready).toBe(true);
    expect(r.fixes).toEqual([]);
  });

  it("fails a bad page with named fixes", () => {
    const bad: MissingPageContent = {
      ...goodPage,
      entitySentence: "",
      answer: "Yes.",
      sections: [{ heading: "Services", body: "x" }],
      faq: [{ q: "A?", a: "b" }],
      updatedOn: "",
    };
    const blocked: RobotsInfo = { ...openRobots, aiCrawlersBlocked: { ...openRobots.aiCrawlersBlocked, GPTBot: true, ClaudeBot: true } };
    const r = checkAnswerReadiness({ kind: "page", page: bad, businessName: "Lekki Plumbers", robots: blocked });
    expect(r.score).toBe(0);
    expect(r.ready).toBe(false);
    expect(r.checks.filter((c) => !c.passed).map((c) => c.id)).toEqual(["entity", "questions", "answer", "faq", "date", "schema", "crawlers"]);
    expect(r.fixes.some((f) => f.includes("Lekki Plumbers, what it does and where"))).toBe(true);
    expect(r.fixes.some((f) => f.includes("GPTBot, ClaudeBot"))).toBe(true);
    expect(r.fixes.some((f) => f.includes("Updated on"))).toBe(true);
  });

  it("does not punish a site whose robots.txt was never fetched", () => {
    const r = checkAnswerReadiness({ kind: "page", page: goodPage, businessName: "Lekki Plumbers", jsonLd, robots: null });
    expect(r.checks.find((c) => c.id === "crawlers")?.passed).toBe(true);
  });
});

describe("checkAnswerReadiness (html)", () => {
  const html = `<html><head><title>T</title>
    <script type="application/ld+json">{"@type":"Organization","name":"Acme Tools"}</script></head>
    <body><nav>menu</nav><h1>Project tracking for small teams</h1>
    <p>Acme Tools is a project tracker built for teams of two to twenty people. It replaces spreadsheets with one shared board that everyone can read in a minute.</p>
    <h2>How much does Acme cost?</h2><p>From 5 dollars a month.</p>
    <h2>Who is it for?</h2><p>Small teams.</p>
    <h2>Does it work offline?</h2><p>Yes.</p>
    <p>Updated on 26 October 2026</p>
    </body></html>`;

  it("scores a well-shaped page highly", () => {
    const r = checkAnswerReadiness({ kind: "html", html, businessName: "Acme Tools" });
    expect(r.ready).toBe(true);
    expect(r.checks.find((c) => c.id === "schema")?.passed).toBe(true);
    expect(r.checks.find((c) => c.id === "date")?.passed).toBe(true);
  });

  it("names the schema mismatch", () => {
    const r = checkAnswerReadiness({ kind: "html", html, businessName: "Other Co" });
    expect(r.checks.find((c) => c.id === "schema")?.passed).toBe(false);
    expect(r.fixes.join(" ")).toContain("names something other than");
  });

  it("fails a thin page", () => {
    const r = checkAnswerReadiness({ kind: "html", html: "<html><body><h1>Hi</h1><p>Welcome.</p></body></html>", businessName: "Acme" });
    expect(r.ready).toBe(false);
    expect(r.fixes.length).toBeGreaterThanOrEqual(5);
  });
});

describe("helpers", () => {
  it("isQuestion", () => {
    expect(isQuestion("How fast can you come?")).toBe(true);
    expect(isQuestion("What we do")).toBe(true);
    expect(isQuestion("Our services")).toBe(false);
  });

  it("jsonLdNamesBusiness walks graphs and tolerates suffixes", () => {
    expect(jsonLdNamesBusiness({ "@graph": [{ name: "Lekki Plumbers Ltd" }] }, "Lekki Plumbers")).toBe(true);
    expect(jsonLdNamesBusiness([{ name: "Someone" }], "Lekki Plumbers")).toBe(false);
  });
});
