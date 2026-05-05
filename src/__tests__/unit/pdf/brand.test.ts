import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDF_BRAND } from "@/src/lib/pdf/brand";

// These assertions guard against an accidental brand regression — if
// somebody flips the primary back to copper, this test breaks. Cheap
// guardrail, well worth keeping.

describe("PDF_BRAND", () => {
  it("uses brand-teal for the primary accent (#2F8C85)", () => {
    expect(PDF_BRAND.accent).toBe("#2F8C85");
  });

  it("uses brand-copper for the secondary accent (#D9663A)", () => {
    expect(PDF_BRAND.accentSecondary).toBe("#D9663A");
  });

  it("primary and secondary accents are distinct", () => {
    expect(PDF_BRAND.accent).not.toBe(PDF_BRAND.accentSecondary);
  });

  it("exposes the required surface ladder + text ladder", () => {
    expect(PDF_BRAND.surface0).toBeTruthy();
    expect(PDF_BRAND.surface1).toBeTruthy();
    expect(PDF_BRAND.surface2).toBeTruthy();
    expect(PDF_BRAND.textPrimary).toBeTruthy();
    expect(PDF_BRAND.textSecondary).toBeTruthy();
    expect(PDF_BRAND.textTertiary).toBeTruthy();
  });
});

describe("PDF templates use the shared brand module", () => {
  // None of the PDF templates may hardcode the old copper-as-primary
  // hex `#D9663A` as their accent. They must read from PDF_BRAND so the
  // brand stays unified.
  const FILES = [
    "src/lib/pdf/audit-report.tsx",
    "src/lib/pdf/analytics-report.tsx",
    "src/lib/pdf/growth-playbook.tsx",
    "src/lib/pdf/generic-content.tsx",
    "src/lib/pdf/blog-post.tsx",
  ];

  for (const file of FILES) {
    it(`${file} imports PDF_BRAND and does not hardcode accent: "#D9663A"`, () => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(src).toContain('from "./brand"');
      // The accent KEY must not be assigned the copper hex directly. We
      // allow `#D9663A` to appear elsewhere in the file (status hex etc.)
      // but the primary `accent: "#D9663A"` line must be gone.
      expect(src).not.toMatch(/accent:\s*"#D9663A"/);
    });
  }
});
