// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blendAnswerability, clampScore, countFaqPairs, extractTextHeadings, looksLikeHtml, scoreAnswerability } from "./answerability";

const goodPost = `Yes, Lekki Plumbers fixes burst pipes the same day anywhere in Lekki. Call before noon and a plumber is usually with you within three hours.

Lekki Plumbers is a licensed plumbing company serving homes and offices in Lekki, Lagos.

## What counts as a plumbing emergency?
A burst pipe, sewage backing up, or no water at all.

## How fast can you come?
Usually within three hours, seven days a week.

## Questions people ask
Do you work weekends?
Yes, seven days a week.

Do you quote before starting?
Yes, always, in writing.

Do you fix water heaters?
Yes, all common brands.

Updated 26 October 2026`;

describe("scoreAnswerability (text)", () => {
  it("gives full marks to an answer-first post with question headings, an entity line, a FAQ and a date", () => {
    const r = scoreAnswerability(goodPost, { businessName: "Lekki Plumbers" });
    expect(r.score).toBe(100);
    expect(r.fixes).toEqual([]);
  });

  it("scores a slogan-first post low and names the fixes", () => {
    const r = scoreAnswerability("Welcome to our amazing site! We are the best. Click here to learn more about everything we do for you and your family today.");
    expect(r.score).toBeLessThanOrEqual(30);
    expect(r.checks.find((c) => c.id === "headings")?.passed).toBe(false);
    expect(r.checks.find((c) => c.id === "faq")?.passed).toBe(false);
    expect(r.checks.find((c) => c.id === "date")?.passed).toBe(false);
    expect(r.fixes.some((f) => /questions people actually type/.test(f))).toBe(true);
  });

  it("fails the entity check when the business name is known and absent", () => {
    const r = scoreAnswerability(goodPost.replace(/Lekki Plumbers/g, "We"), { businessName: "Lekki Plumbers" });
    expect(r.checks.find((c) => c.id === "entity")?.passed).toBe(false);
    // Without a name to look for, the plain entity sentence is enough.
    expect(scoreAnswerability(goodPost.replace(/Lekki Plumbers/g, "Our company")).checks.find((c) => c.id === "entity")?.passed).toBe(true);
  });

  it("does not count a question as a direct answer", () => {
    const r = scoreAnswerability("Looking for a plumber in Lekki who actually shows up on time and fixes it first time? We might be exactly who you need.");
    expect(r.checks.find((c) => c.id === "answer")?.passed).toBe(false);
  });

  it("scores empty content at zero", () => {
    expect(scoreAnswerability("").score).toBe(0);
  });
});

describe("scoreAnswerability (html)", () => {
  it("reuses the hosted-page checks on HTML", () => {
    const html = `<html><body><h1>Emergency plumber in Lekki</h1>
      <p>Yes, Lekki Plumbers sends a plumber the same day for burst pipes and leaks anywhere in Lekki. Call before noon and we usually arrive within three hours.</p>
      <p>Lekki Plumbers is a plumbing company serving homes in Lekki, Lagos.</p>
      <h2>What counts as an emergency?</h2><p>A burst pipe.</p>
      <h2>How fast can you come?</h2><p>Three hours.</p>
      <details><summary>Weekends?</summary><p>Yes.</p></details>
      <details><summary>Quote first?</summary><p>Yes.</p></details>
      <details><summary>Heaters?</summary><p>Yes.</p></details>
      <p>Updated on <time datetime="2026-10-26">26 October 2026</time></p></body></html>`;
    expect(looksLikeHtml(html)).toBe(true);
    const r = scoreAnswerability(html, { businessName: "Lekki Plumbers" });
    expect(r.score).toBe(100);
  });
});

describe("helpers", () => {
  it("extracts markdown, bold and short question lines as headings", () => {
    expect(extractTextHeadings("## Why us?\n**How it works**\nDo you deliver?\nThis is a long sentence that happens to end with a question mark, does it count as a heading though?")).toEqual(["Why us?", "How it works", "Do you deliver?"]);
  });
  it("counts question-answer pairs", () => {
    expect(countFaqPairs("Q: Weekends?\nA: Yes.\nQ: Quote first?\nA: Always.\nOne more?\nNo answer here?\nFine.")).toBe(3);
  });
  it("blends the model's number with the deterministic score and clamps junk", () => {
    expect(blendAnswerability(80, 60)).toBe(70);
    expect(blendAnswerability("90", 50)).toBe(70);
    expect(blendAnswerability(null, 55)).toBe(55);
    expect(blendAnswerability(250, 50)).toBe(75);
    expect(clampScore("x")).toBeNull();
    expect(clampScore(-4)).toBe(0);
  });
});
