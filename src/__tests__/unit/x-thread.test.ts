import { describe, it, expect } from "vitest";
import { splitForX } from "@/src/lib/integrations/x-thread";

const X_LIMIT = 280;

describe("splitForX", () => {
  it("returns empty array for empty/whitespace input", () => {
    expect(splitForX("")).toEqual([]);
    expect(splitForX("   \n  ")).toEqual([]);
  });

  it("returns single tweet for short text", () => {
    expect(splitForX("hello world")).toEqual(["hello world"]);
  });

  it("returns single tweet at exactly 280 chars", () => {
    const text = "a".repeat(280);
    expect(splitForX(text)).toEqual([text]);
  });

  it("splits text just over 280 chars into multiple chunks under the limit", () => {
    const text = "a".repeat(281);
    const result = splitForX(text);
    expect(result.length).toBeGreaterThan(1);
    for (const c of result) {
      expect(c.length).toBeLessThanOrEqual(X_LIMIT);
    }
  });

  it("preserves paragraph boundaries when each paragraph fits", () => {
    const para1 = "Para one text. ".repeat(15).trim(); // ~225 chars
    const para2 = "Para two thoughts. ".repeat(13).trim(); // ~245 chars
    const text = `${para1}\n\n${para2}`;
    const result = splitForX(text);
    expect(result).toEqual([para1, para2]);
  });

  it("splits a long paragraph along sentence boundaries", () => {
    const sentence = "This is one carefully crafted sentence about marketing. ";
    const text = sentence.repeat(15).trim(); // ~840 chars, no paragraph breaks
    const result = splitForX(text);
    expect(result.length).toBeGreaterThan(1);
    for (const c of result) {
      expect(c.length).toBeLessThanOrEqual(X_LIMIT);
    }
    const joined = result.join(" ");
    expect(joined.replace(/\s+/g, " ").trim()).toBe(text.replace(/\s+/g, " ").trim());
  });

  it("falls back to word boundaries when a single sentence is too long", () => {
    const longSentence = "word".concat(" andmore".repeat(80)); // no punctuation, ~640 chars
    const result = splitForX(longSentence);
    expect(result.length).toBeGreaterThan(1);
    for (const c of result) {
      expect(c.length).toBeLessThanOrEqual(X_LIMIT);
    }
  });

  it("handles a single mega-paragraph that mixes long and short sentences", () => {
    const text = [
      "Short hook.",
      "A".repeat(400),
      "Closing thought.",
    ].join(" ");
    const result = splitForX(text);
    for (const c of result) {
      expect(c.length).toBeLessThanOrEqual(X_LIMIT);
    }
    expect(result.length).toBeGreaterThan(1);
  });

  it("hard-chops a single word longer than 280 chars (extreme edge)", () => {
    const text = "a".repeat(700);
    const result = splitForX(text);
    expect(result.length).toBeGreaterThanOrEqual(3);
    for (const c of result) {
      expect(c.length).toBeLessThanOrEqual(X_LIMIT);
    }
  });

  it("trims surrounding whitespace from chunks", () => {
    const text = `  ${"x".repeat(150)}  \n\n  ${"y".repeat(150)}  `;
    const result = splitForX(text);
    expect(result.length).toBe(2);
    for (const c of result) {
      expect(c).toBe(c.trim());
    }
  });
});
