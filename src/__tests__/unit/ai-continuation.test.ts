import { describe, it, expect } from "vitest";
import { continuePrompt, continuationMessages, joinContinuation, textOf, withMaxTokensFloor } from "@/src/lib/ai/client";

describe("continuationMessages", () => {
  it("is a single user turn when there is nothing to continue", () => {
    expect(continuationMessages("Write it", "")).toEqual([{ role: "user", content: "Write it" }]);
  });

  it("always ends with a user turn (the 5.5 models reject assistant prefill)", () => {
    const m = continuationMessages("Write it", '{"a": "half   ');
    expect(m.map((t) => t.role)).toEqual(["user", "assistant", "user"]);
    expect(m[m.length - 1].role).toBe("user");
    expect(m[1].content).toBe('{"a": "half');
    expect(m[2].content).toBe(continuePrompt('{"a": "half'));
  });
});

describe("continuePrompt", () => {
  it("quotes the tail of the cut-off answer and asks for the rest without repeats", () => {
    const p = continuePrompt("The plan has three parts. First, email the ");
    expect(p).toContain("Your previous response was interrupted and ended with: The plan has three parts. First, email the");
    expect(p).toContain("Continue from exactly where you left off without repeating anything.");
  });

  it("quotes at most the last 300 characters", () => {
    const long = "x".repeat(1000) + "END";
    const p = continuePrompt(long);
    expect(p).toContain("ended with: " + "x".repeat(297) + "END");
    expect(p).not.toContain("x".repeat(298) + "END");
  });
});

describe("joinContinuation", () => {
  it("appends plainly when the model picks up cleanly", () => {
    expect(joinContinuation('{"items": ["one", "tw', 'o", "three"]}')).toBe('{"items": ["one", "two", "three"]}');
  });

  it("drops text the model repeated at the seam", () => {
    const soFar = '{"title": "Spring launch plan", "steps": ["Email the waitlist on Monday morning",';
    const next = '"Email the waitlist on Monday morning", "Post the demo video"]}';
    expect(joinContinuation(soFar, next)).toBe(
      '{"title": "Spring launch plan", "steps": ["Email the waitlist on Monday morning", "Post the demo video"]}'
    );
  });

  it("ignores tiny accidental overlaps", () => {
    expect(joinContinuation("abc the", " the end")).toBe("abc the the end");
  });
});

describe("textOf", () => {
  it("skips leading thinking blocks and joins every text block in order", () => {
    expect(
      textOf([
        { type: "thinking", text: "" },
        { type: "thinking" },
        { type: "text", text: "Hello, " },
        { type: "tool_use" },
        { type: "text", text: "world" },
      ]),
    ).toBe("Hello, world");
  });

  it("is empty when there is no text block", () => {
    expect(textOf([{ type: "thinking", text: "" }])).toBe("");
    expect(textOf([])).toBe("");
  });
});

describe("withMaxTokensFloor", () => {
  it("never asks for fewer than 2048 tokens", () => {
    expect(withMaxTokensFloor(100)).toBe(2048);
    expect(withMaxTokensFloor(2048)).toBe(2048);
    expect(withMaxTokensFloor(0)).toBe(2048);
    expect(withMaxTokensFloor(NaN)).toBe(2048);
  });

  it("leaves larger caps alone", () => {
    expect(withMaxTokensFloor(24_000)).toBe(24_000);
  });
});
