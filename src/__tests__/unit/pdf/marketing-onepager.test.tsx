import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { MarketingOnePagerDocument } from "@/src/lib/pdf/marketing-onepager";

// Render-to-buffer is the most realistic way to assert the template is
// well-formed: any malformed JSX or invalid style ends up throwing
// here. We don't snapshot the binary output (it's non-deterministic
// across @react-pdf versions), but we do check it's a non-trivial PDF.

describe("MarketingOnePagerDocument", () => {
  it("renders to a non-empty PDF buffer", async () => {
    const element = React.createElement(MarketingOnePagerDocument);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF magic header — every valid PDF starts with %PDF-
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  }, 15000);
});
