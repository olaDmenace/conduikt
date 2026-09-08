import { describe, it, expect, vi } from "vitest";
import {
  fetchPageSignal,
  normalizeAuditUrl,
  scoreToGrade,
} from "@/src/lib/onboarding/magic-audit";

describe("magic-audit · normalizeAuditUrl", () => {
  it("accepts a full https URL", () => {
    expect(normalizeAuditUrl("https://acme.com")).toBe("https://acme.com/");
  });

  it("accepts a bare domain and prepends https://", () => {
    expect(normalizeAuditUrl("acme.com")).toBe("https://acme.com/");
  });

  it("accepts subdomains + paths", () => {
    expect(normalizeAuditUrl("blog.acme.com/posts/1")).toBe(
      "https://blog.acme.com/posts/1"
    );
  });

  it("trims whitespace", () => {
    expect(normalizeAuditUrl("  acme.com  ")).toBe("https://acme.com/");
  });

  it("rejects the empty string", () => {
    expect(normalizeAuditUrl("")).toBeNull();
  });

  it("rejects a hostname with no dot", () => {
    expect(normalizeAuditUrl("localhost")).toBeNull();
  });

  it("rejects non-http protocols", () => {
    expect(normalizeAuditUrl("ftp://acme.com")).toBeNull();
    expect(normalizeAuditUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects gibberish that doesn't parse as a URL", () => {
    expect(normalizeAuditUrl("not a url at all")).toBeNull();
  });
});

describe("magic-audit · scoreToGrade", () => {
  it("assigns A for 90+", () => {
    expect(scoreToGrade(100)).toBe("A");
    expect(scoreToGrade(90)).toBe("A");
  });
  it("assigns B for 80-89", () => {
    expect(scoreToGrade(89)).toBe("B");
    expect(scoreToGrade(80)).toBe("B");
  });
  it("assigns C for 70-79", () => {
    expect(scoreToGrade(79)).toBe("C");
    expect(scoreToGrade(70)).toBe("C");
  });
  it("assigns D for 60-69", () => {
    expect(scoreToGrade(69)).toBe("D");
    expect(scoreToGrade(60)).toBe("D");
  });
  it("assigns F below 60", () => {
    expect(scoreToGrade(59)).toBe("F");
    expect(scoreToGrade(0)).toBe("F");
  });
});

describe("magic-audit · fetchPageSignal", () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>Acme &mdash; Better Widgets</title>
    <meta name="description" content="Widgets that don't suck. Trusted by 5000 teams.">
  </head>
  <body>
    <h1>Ship better widgets, faster</h1>
    <p>We help SaaS teams ship widgets that scale.</p>
    <script>console.log('should be stripped')</script>
    <style>.foo{color:red}</style>
  </body>
</html>`;

  it("extracts title, meta description, and h1 from HTML", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(sampleHtml),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    // &mdash; is not in our decoder — leave as-is for demonstration
    expect(signal.title).toContain("Acme");
    expect(signal.metaDescription).toBe(
      "Widgets that don't suck. Trusted by 5000 teams."
    );
    expect(signal.h1).toBe("Ship better widgets, faster");
  });

  it("strips <script> and <style> from body text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(sampleHtml),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.bodyText).not.toContain("console.log");
    expect(signal.bodyText).not.toContain("color:red");
    expect(signal.bodyText).toContain("Ship better widgets");
  });

  it("caps body text at 4000 characters", async () => {
    const huge = "<html><body>" + "x".repeat(10_000) + "</body></html>";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(huge),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.bodyText.length).toBeLessThanOrEqual(4000);
  });

  it("returns nulls (does not throw) when fetch throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network fail"));
    const signal = await fetchPageSignal(
      "https://acme.com",
      fetchImpl as unknown as typeof fetch
    );
    expect(signal.title).toBeNull();
    expect(signal.metaDescription).toBeNull();
    expect(signal.h1).toBeNull();
    expect(signal.bodyText).toBe("");
    expect(signal.url).toBe("https://acme.com");
  });

  it("returns nulls when fetch response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("shouldn't be read"),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.title).toBeNull();
    expect(signal.bodyText).toBe("");
  });

  it("decodes common HTML entities in title/meta/h1", async () => {
    const html = `<title>Acme &amp; Co &lt;beta&gt;</title>
    <meta name="description" content="It&#39;s great &quot;really&quot;">
    <h1>One &nbsp; two</h1>`;
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.title).toBe("Acme & Co <beta>");
    expect(signal.metaDescription).toBe(`It's great "really"`);
    expect(signal.h1).toBe("One   two");
  });
});
