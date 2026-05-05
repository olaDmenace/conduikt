import { describe, it, expect } from "vitest";
import {
  buildBrandHeader,
  prependBrandHeader,
} from "@/src/lib/email/brand-header";

describe("buildBrandHeader", () => {
  it("returns empty string when no logo url is configured", () => {
    expect(buildBrandHeader({ logoUrl: null })).toBe("");
    expect(buildBrandHeader({ logoUrl: undefined })).toBe("");
    expect(buildBrandHeader({ logoUrl: "" })).toBe("");
    expect(buildBrandHeader({ logoUrl: "   " })).toBe("");
  });

  it("renders an <img> with the URL + alt text when logo is set", () => {
    const out = buildBrandHeader({
      logoUrl: "https://cdn.example.com/logo.png",
      altText: "Acme Corp",
    });
    expect(out).toContain("<img");
    expect(out).toContain("src='https://cdn.example.com/logo.png'");
    expect(out).toContain("alt='Acme Corp'");
  });

  it("uses 'Logo' as fallback alt when altText is blank", () => {
    const out = buildBrandHeader({
      logoUrl: "https://cdn.example.com/logo.png",
      altText: "",
    });
    expect(out).toContain("alt='Logo'");
  });

  it("escapes single quotes + < in altText to keep the attribute safe", () => {
    const out = buildBrandHeader({
      logoUrl: "https://x/y.png",
      altText: "Bob's <Awesome> Co",
    });
    expect(out).toContain("alt='Bob&#39;s &lt;Awesome> Co'");
  });

  it("URL-encodes single quotes in the URL to avoid attribute breakage", () => {
    const out = buildBrandHeader({
      logoUrl: "https://x/y'z.png",
      altText: "x",
    });
    expect(out).toContain("src='https://x/y%27z.png'");
  });

  it("respects the max-height + max-width constraints", () => {
    const out = buildBrandHeader({
      logoUrl: "https://x/y.png",
      altText: "x",
    });
    expect(out).toContain("max-height:48px");
    expect(out).toContain("max-width:220px");
    expect(out).toContain("width:auto");
  });
});

describe("prependBrandHeader", () => {
  it("returns the body unchanged when no logo is configured", () => {
    const body = "<p>Hello</p>";
    expect(prependBrandHeader(body, { logoUrl: null })).toBe(body);
  });

  it("prepends the header to a body without <body> tags", () => {
    const out = prependBrandHeader("<p>Hello</p>", {
      logoUrl: "https://x/y.png",
      altText: "Brand",
    });
    expect(out.startsWith("<table")).toBe(true);
    expect(out).toContain("<p>Hello</p>");
    // Logo should appear BEFORE the body content.
    expect(out.indexOf("<img")).toBeLessThan(out.indexOf("<p>Hello</p>"));
  });

  it("inserts the header just inside <body> when present", () => {
    const html = '<html><body class="x"><p>Hi</p></body></html>';
    const out = prependBrandHeader(html, {
      logoUrl: "https://x/y.png",
      altText: "Brand",
    });
    // The header should sit between <body class="x"> and <p>Hi</p>.
    expect(out).toMatch(/<body class="x">\s*<table[\s\S]*?<\/table>\s*<p>Hi<\/p>/);
  });

  it("preserves the original markup when prepending", () => {
    const html = "<div><h1>Hello</h1><p>World</p></div>";
    const out = prependBrandHeader(html, {
      logoUrl: "https://x/y.png",
      altText: "Brand",
    });
    expect(out).toContain("<div><h1>Hello</h1><p>World</p></div>");
  });
});
