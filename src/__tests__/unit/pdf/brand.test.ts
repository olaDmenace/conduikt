import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDF_BRAND, PDF_FONTS } from "@/src/lib/pdf/brand";

// Guards against a brand regression in the PDFs: they must stay on the
// Direction C palette (docs/DESIGN.md) that the app uses — sand ground,
// ink bands, one orange accent, teal for data.

describe("PDF_BRAND", () => {
  it("matches the Direction C tokens in globals.css", () => {
    expect(PDF_BRAND.ground).toBe("#EAE4D5");
    expect(PDF_BRAND.ink).toBe("#1E2A2E");
    expect(PDF_BRAND.accent).toBe("#B24E27");
    expect(PDF_BRAND.teal).toBe("#1F6B66");
  });

  it("keeps the retired Mineral colours out", () => {
    const values = Object.values(PDF_BRAND).map((v) => v.toUpperCase());
    for (const old of ["#0C0C0E", "#2F8C85", "#E8E4DE"]) expect(values).not.toContain(old);
  });

  it("legacy names resolve to v2 values", () => {
    expect(PDF_BRAND.surface0).toBe(PDF_BRAND.ground);
    expect(PDF_BRAND.textPrimary).toBe(PDF_BRAND.text);
  });

  it("uses the app's three type families", () => {
    expect(PDF_FONTS).toEqual({ display: "Space Grotesk", body: "Geist", mono: "JetBrains Mono" });
  });
});

describe("PDF templates use the shared brand module", () => {
  const FILES = [
    "src/lib/pdf/audit-report.tsx",
    "src/lib/pdf/analytics-report.tsx",
    "src/lib/pdf/growth-playbook.tsx",
    "src/lib/pdf/generic-content.tsx",
    "src/lib/pdf/blog-post.tsx",
    "src/lib/pdf/marketing-onepager.tsx",
    "src/lib/pdf/first-week-report.tsx",
  ];

  for (const file of FILES) {
    it(`${file} reads colours and fonts from brand.ts, with no hex and no Helvetica`, () => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(src).toContain('from "./brand"');
      expect(src).toContain("registerPdfFonts");
      expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src).not.toMatch(/Helvetica/);
    });
  }
});
