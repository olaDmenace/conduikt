// @vitest-environment node
import { describe, expect, it } from "vitest";
import { safeHref } from "./build";

describe("safeHref", () => {
  it("keeps web, mail, phone and site-relative links", () => {
    expect(safeHref("https://lekki.ng/contact")).toBe("https://lekki.ng/contact");
    expect(safeHref(" http://lekki.ng ")).toBe("http://lekki.ng");
    expect(safeHref("mailto:hello@lekki.ng")).toBe("mailto:hello@lekki.ng");
    expect(safeHref("tel:+2348000000000")).toBe("tel:+2348000000000");
    expect(safeHref("/contact")).toBe("/contact");
    expect(safeHref("#quote")).toBe("#quote");
  });

  it("drops script, data and protocol-relative links the model may have been injected with", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#contact");
    expect(safeHref("JavaScript:alert(1)")).toBe("#contact");
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#contact");
    expect(safeHref("vbscript:msgbox")).toBe("#contact");
    expect(safeHref("//evil.example/phish")).toBe("#contact");
    expect(safeHref("")).toBe("#contact");
  });
});
