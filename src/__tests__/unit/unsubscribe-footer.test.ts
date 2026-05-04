import { describe, it, expect } from "vitest";
import { ensureUnsubscribeFooter } from "@/src/lib/email/marketing";

describe("ensureUnsubscribeFooter", () => {
  it("appends a footer when html has no unsubscribe variable", () => {
    const html = "<p>Hello world</p>";
    const out = ensureUnsubscribeFooter(html);
    expect(out).toContain("<p>Hello world</p>");
    expect(out).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(out).toContain("Unsubscribe");
  });

  it("returns html unchanged when {{{RESEND_UNSUBSCRIBE_URL}}} already present", () => {
    const html =
      '<p>Hi <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe me</a></p>';
    const out = ensureUnsubscribeFooter(html);
    expect(out).toBe(html);
  });

  it("returns html unchanged for the case-insensitive token", () => {
    // Authors might use single or triple braces, lower or upper case.
    const html = "<p>Hi {{ resend_unsubscribe_url }}</p>";
    const out = ensureUnsubscribeFooter(html);
    expect(out).toBe(html);
  });

  it("injects before </body> when html is a full document", () => {
    const html = "<html><body><p>Hi</p></body></html>";
    const out = ensureUnsubscribeFooter(html);
    expect(out).toContain("<p>Hi</p>");
    // Footer must be inside the body, before </body>
    const bodyEnd = out.indexOf("</body>");
    const footerStart = out.indexOf("Unsubscribe");
    expect(footerStart).toBeGreaterThan(0);
    expect(footerStart).toBeLessThan(bodyEnd);
  });

  it("appends after content when no </body> tag", () => {
    const html = "<p>Bare fragment</p>";
    const out = ensureUnsubscribeFooter(html);
    const fragmentEnd = out.indexOf("</p>");
    const footerStart = out.indexOf("Unsubscribe");
    expect(footerStart).toBeGreaterThan(fragmentEnd);
  });
});
