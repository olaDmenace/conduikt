// @vitest-environment node
import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config";

// Builds the real header set from next.config.ts and checks the CSP is
// enforced (not Report-Only) and still lists every third party the app
// talks to. If a source is removed by mistake the browser would block it
// in production; this test fails first.

async function cspHeader() {
  const groups = await nextConfig.headers!();
  const catchAll = groups.find((g) => g.source === "/:path*");
  expect(catchAll, "security headers must apply to every path").toBeDefined();
  const header = catchAll!.headers.find((h) => h.key === "Content-Security-Policy");
  expect(header, "Content-Security-Policy header must be present").toBeDefined();
  return header!.value;
}

function directive(csp: string, name: string): string {
  const d = csp
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name} `) || s === name);
  expect(d, `${name} directive must exist`).toBeDefined();
  return d!;
}

describe("Content Security Policy", () => {
  it("is enforced, not report-only", async () => {
    const groups = await nextConfig.headers!();
    const keys = groups.flatMap((g) => g.headers.map((h) => h.key));
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).not.toContain("Content-Security-Policy-Report-Only");
  });

  it("keeps the report sink so new violations still arrive", async () => {
    const csp = await cspHeader();
    expect(directive(csp, "report-uri")).toBe("report-uri /api/csp-report/");
  });

  it("allows Supabase data and realtime", async () => {
    const connect = directive(await cspHeader(), "connect-src");
    expect(connect).toContain("https://*.supabase.co");
    expect(connect).toContain("wss://*.supabase.co");
  });

  it("allows generated videos to play from Supabase Storage", async () => {
    // video-pipeline.ts stores final.mp4 in the public "videos" bucket and
    // the video page renders <video src={publicUrl}>. Without media-src the
    // player falls back to default-src 'self' and the browser blocks it.
    const media = directive(await cspHeader(), "media-src");
    expect(media).toContain("'self'");
    expect(media).toContain("blob:");
    expect(media).toContain("https://*.supabase.co");
  });

  it("allows Anthropic", async () => {
    const connect = directive(await cspHeader(), "connect-src");
    expect(connect).toContain("https://api.anthropic.com");
  });

  it("allows Flutterwave and Paystack checkout", async () => {
    const csp = await cspHeader();
    const script = directive(csp, "script-src");
    const connect = directive(csp, "connect-src");
    const frame = directive(csp, "frame-src");
    const form = directive(csp, "form-action");
    expect(script).toContain("https://checkout.flutterwave.com");
    expect(script).toContain("https://js.paystack.co");
    expect(connect).toContain("https://checkout.flutterwave.com");
    expect(connect).toContain("https://api.paystack.co");
    expect(frame).toContain("https://checkout.flutterwave.com");
    expect(frame).toContain("https://checkout.paystack.com");
    expect(form).toContain("https://checkout.flutterwave.com");
    expect(form).toContain("https://checkout.paystack.com");
  });

  it("allows the Tawk chat widget", async () => {
    const csp = await cspHeader();
    expect(directive(csp, "script-src")).toContain("https://*.tawk.to");
    expect(directive(csp, "style-src")).toContain("https://embed.tawk.to");
    expect(directive(csp, "font-src")).toContain("https://embed.tawk.to");
    expect(directive(csp, "connect-src")).toContain("wss://*.tawk.to");
    expect(directive(csp, "frame-src")).toContain("https://*.tawk.to");
  });

  it("allows Google Tag Manager and Analytics, including the google.com beacon", async () => {
    const csp = await cspHeader();
    expect(directive(csp, "script-src")).toContain("https://www.googletagmanager.com");
    const connect = directive(csp, "connect-src");
    expect(connect).toContain("https://www.googletagmanager.com");
    expect(connect).toContain("https://*.google-analytics.com");
    expect(connect).toContain("https://*.analytics.google.com");
    // GA also beacons to https://www.google.com/g/collect; the report log
    // showed this blocked while the policy was Report-Only.
    expect(connect).toContain("https://www.google.com");
    // Hosted pages embed a keyless Google Maps iframe at
    // https://www.google.com/maps?...&output=embed (hosted-pages/html.ts).
    expect(directive(csp, "frame-src")).toContain("https://www.google.com");
  });

  it("keeps the hardening directives", async () => {
    const csp = await cspHeader();
    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
    // 'self', not 'none': /share renders the one-pager preview with
    // <object data="/api/marketing-kit/pdf">. Same-origin only, so
    // third-party plugins are still blocked.
    expect(directive(csp, "object-src")).toBe("object-src 'self'");
  });
});
