import { describe, it, expect } from "vitest";
import { canUnsuppress, HARD_SUPPRESSED, parseSuppressionList, SUPPRESSION_LIST_MAX } from "@/src/lib/email/suppression";

describe("parseSuppressionList", () => {
  it("accepts one email per line", () => {
    const out = parseSuppressionList("a@x.com\nb@x.com\n\nc@x.com\n");
    expect(out.emails).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
    expect(out.invalid).toEqual([]);
    expect(out.duplicates).toBe(0);
  });

  it("accepts commas, semicolons and mixed whitespace", () => {
    const out = parseSuppressionList("a@x.com, b@x.com;c@x.com   d@x.com\r\ne@x.com");
    expect(out.emails).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
  });

  it("lowercases and de-duplicates", () => {
    const out = parseSuppressionList("A@X.com\na@x.com\nB@x.com");
    expect(out.emails).toEqual(["a@x.com", "b@x.com"]);
    expect(out.duplicates).toBe(1);
  });

  it("reports entries that aren't emails without dropping the good ones", () => {
    const out = parseSuppressionList("good@x.com\nnot-an-email\n@nope\nalso@fine.org");
    expect(out.emails).toEqual(["good@x.com", "also@fine.org"]);
    expect(out.invalid).toEqual(["not-an-email", "@nope"]);
  });

  it("unwraps Name <addr> and quoted addresses pasted from a mail client", () => {
    const out = parseSuppressionList('<a@x.com>\n"b@x.com"');
    expect(out.emails).toEqual(["a@x.com", "b@x.com"]);
  });

  it("returns nothing for an empty paste", () => {
    expect(parseSuppressionList("")).toEqual({ emails: [], invalid: [], duplicates: 0 });
    expect(parseSuppressionList("   \n  ")).toEqual({ emails: [], invalid: [], duplicates: 0 });
  });

  it("caps the list", () => {
    const many = Array.from({ length: SUPPRESSION_LIST_MAX + 5 }, (_, i) => `u${i}@x.com`).join("\n");
    expect(parseSuppressionList(many).emails).toHaveLength(SUPPRESSION_LIST_MAX);
  });
});

describe("status rules", () => {
  it("bounced and complained are hard-suppressed", () => {
    expect(HARD_SUPPRESSED.has("bounced")).toBe(true);
    expect(HARD_SUPPRESSED.has("complained")).toBe(true);
    expect(HARD_SUPPRESSED.has("suppressed")).toBe(false);
  });

  it("owners can unsuppress manual and unsubscribed, not bounced", () => {
    expect(canUnsuppress("suppressed")).toBe(true);
    expect(canUnsuppress("unsubscribed")).toBe(true);
    expect(canUnsuppress("bounced")).toBe(false);
    expect(canUnsuppress("pending")).toBe(false);
  });
});
