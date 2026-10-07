import { describe, it, expect } from "vitest";
import { CONTINUE_PROMPT, continuationMessages, joinContinuation } from "@/src/lib/ai/client";

describe("continuationMessages", () => {
  it("is a single user turn when there is nothing to continue", () => {
    expect(continuationMessages("Write it", "")).toEqual([{ role: "user", content: "Write it" }]);
  });

  it("always ends with a user turn (current models reject assistant prefill)", () => {
    const m = continuationMessages("Write it", '{"a": "half   ');
    expect(m.map((t) => t.role)).toEqual(["user", "assistant", "user"]);
    expect(m[1].content).toBe('{"a": "half');
    expect(m[2].content).toBe(CONTINUE_PROMPT);
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
