import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";

describe("parseJsonResponse — happy paths", () => {
  it("parses pure JSON", () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in markdown code fence (```json)", () => {
    const text = '```json\n{"a":1,"b":[2,3]}\n```';
    expect(parseJsonResponse(text)).toEqual({ a: 1, b: [2, 3] });
  });

  it("parses JSON wrapped in plain code fence (```)", () => {
    const text = '```\n{"x":"y"}\n```';
    expect(parseJsonResponse(text)).toEqual({ x: "y" });
  });

  it("strips preamble text and parses the first balanced object", () => {
    const text = "Here is your JSON:\n\n{\"a\":1}\n\nHope that helps!";
    expect(parseJsonResponse(text)).toEqual({ a: 1 });
  });

  it("handles JSON containing strings with braces", () => {
    const text = '{"text":"this has { and } inside"}';
    expect(parseJsonResponse(text)).toEqual({ text: "this has { and } inside" });
  });

  it("handles escaped quotes inside string values", () => {
    const text = '{"q":"she said \\"hi\\""}';
    expect(parseJsonResponse(text)).toEqual({ q: 'she said "hi"' });
  });

  it("parses nested objects + arrays", () => {
    const text = '{"a":{"b":[1,{"c":2}]}}';
    expect(parseJsonResponse(text)).toEqual({ a: { b: [1, { c: 2 }] } });
  });
});

describe("parseJsonResponse — truncation repair", () => {
  it("recovers an array with a trailing incomplete element", () => {
    // Model produced 2 complete emails and started a third before being
    // cut off mid-string. We expect recovery of the 2 complete emails.
    const truncated =
      '{"emails":[{"step":1,"subject":"Hi"},{"step":2,"subject":"Bye"},{"step":3,"subject":"Cu';
    const result = parseJsonResponse(truncated) as {
      emails: { step: number }[];
    };
    expect(result.emails).toHaveLength(2);
    expect(result.emails[0].step).toBe(1);
    expect(result.emails[1].step).toBe(2);
  });

  it("recovers when truncation cuts off mid-value at the top level", () => {
    const truncated = '{"name":"Alice","age":42,"hobby":"sky';
    const result = parseJsonResponse(truncated) as {
      name: string;
      age: number;
    };
    expect(result.name).toBe("Alice");
    expect(result.age).toBe(42);
    // hobby was incomplete — should be dropped, not malformed
    expect("hobby" in result).toBe(false);
  });

  it("recovers when nested array is mid-element", () => {
    const truncated = '{"items":[{"id":1,"name":"first"},{"id":2,"name":"sec';
    const result = parseJsonResponse(truncated) as {
      items: { id: number }[];
    };
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(1);
  });

  it("recovers when truncation lands on an unclosed string deep inside", () => {
    const truncated =
      '{"sequence_name":"Welcome","emails":[{"body_html":"<p>Hello</p>"},{"body_html":"<p>partial';
    const result = parseJsonResponse(truncated) as {
      sequence_name: string;
      emails: { body_html: string }[];
    };
    expect(result.sequence_name).toBe("Welcome");
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0].body_html).toBe("<p>Hello</p>");
  });

  it("strips trailing comma before closing recovered structure", () => {
    const truncated = '{"items":[{"a":1},{"b":2},';
    const result = parseJsonResponse(truncated) as { items: unknown[] };
    expect(result.items).toHaveLength(2);
  });

  it("throws when there is no salvageable JSON at all", () => {
    expect(() => parseJsonResponse("plain text, no JSON")).toThrow();
  });

  it("throws when there's an opening { but no complete value before truncation", () => {
    expect(() => parseJsonResponse('{"key":"val')).toThrow();
  });
});

describe("parseJsonResponse — string-aware brace counting", () => {
  it("does not get confused by braces inside strings", () => {
    const text = '{"code":"if (x) { return y } else { return z }","ok":true}';
    expect(parseJsonResponse(text)).toEqual({
      code: "if (x) { return y } else { return z }",
      ok: true,
    });
  });

  it("handles string ending with escaped backslash followed by quote", () => {
    // The string value is: c:\path\
    const text = '{"path":"c:\\\\path\\\\"}';
    const result = parseJsonResponse(text) as { path: string };
    expect(result.path).toBe("c:\\path\\");
  });
});
