import { describe, it, expect, vi } from "vitest";
import {
  fetchPageSignal,
  normalizeAuditUrl,
  scoreToGrade,
  signalUnreachableMessage,
} from "@/src/lib/onboarding/magic-audit";
import { OUR_USER_AGENT } from "@/src/lib/crawl/robots";

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
    expect(signal.fetchOk).toBe(true);
    expect(signal.blocked).toBe(false);
    expect(signal.fetchError).toBeNull();
  });

  it("reads the site as ConduiktBot, in English, like the crawler does", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve(sampleHtml) }) as unknown as typeof fetch;
    await fetchPageSignal("https://acme.com", fetchImpl);
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["User-Agent"]).toContain(OUR_USER_AGENT);
    expect(init.headers["Accept-Language"]).toBe("en");
  });

  it("reports a 403 bot challenge as blocked, never as an empty page", async () => {
    const challenge = `<!DOCTYPE html><html><head><title>Just a moment...</title></head><body><script src="/cdn-cgi/challenge-platform/h/b/orchestrate/jsch/v1"></script></body></html>`;
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "cf-mitigated": "challenge" }),
      text: () => Promise.resolve(challenge),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.fetchOk).toBe(false);
    expect(signal.blocked).toBe(true);
    expect(signal.fetchStatus).toBe(403);
    expect(signal.fetchError).toContain("blocked");
    // The challenge page's own title must not leak into the audit.
    expect(signal.title).toBeNull();
    expect(signal.html).toBe("");
    expect(signalUnreachableMessage(signal)).toBe(
      "We couldn't read acme.com (status 403). It looks like your site's bot protection blocked us. Allow the user agent ConduiktBot and try again."
    );
  });

  it("reports a 503 challenge page as blocked by its title alone", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
      text: () => Promise.resolve("<html><head><title>Attention Required! | Cloudflare</title></head></html>"),
    }) as unknown as typeof fetch;
    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.fetchOk).toBe(false);
    expect(signal.blocked).toBe(true);
    expect(signal.fetchStatus).toBe(503);
  });

  it("reports a timeout as a fetch error with no status", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    const fetchImpl = vi.fn().mockRejectedValue(timeout);
    const signal = await fetchPageSignal("https://acme.com", fetchImpl as unknown as typeof fetch);
    expect(signal.fetchOk).toBe(false);
    expect(signal.blocked).toBe(false);
    expect(signal.fetchStatus).toBeNull();
    expect(signal.fetchError).toBe("timed out");
    expect(signalUnreachableMessage(signal)).toBe("We couldn't read acme.com right now (timed out). Try again in a few minutes.");
  });

  it("reports a plain server error with its status and not as blocked", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, headers: new Headers(), text: () => Promise.resolve("oops") }) as unknown as typeof fetch;
    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.fetchOk).toBe(false);
    expect(signal.blocked).toBe(false);
    expect(signal.fetchStatus).toBe(500);
    expect(signalUnreachableMessage(signal)).toContain("(status 500)");
  });

  it("does not call a 200 with an empty body a page: fetchOk is false and the status is kept", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve("  \n ") }) as unknown as typeof fetch;
    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.fetchOk).toBe(false);
    expect(signal.blocked).toBe(false);
    expect(signal.fetchStatus).toBe(200);
    expect(signal.fetchError).toBe("empty response");
    expect(signal.html).toBe("  \n ");
    expect(signalUnreachableMessage(signal)).toBe("We couldn't read acme.com right now (status 200). Try again in a few minutes.");
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
    expect(signal.fetchOk).toBe(false);
    expect(signal.fetchError).toBe("network fail");
  });

  it("returns nulls when fetch response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("shouldn't be read"),
    }) as unknown as typeof fetch;

    const signal = await fetchPageSignal("https://acme.com", fetchImpl);
    expect(signal.title).toBeNull();
    expect(signal.bodyText).toBe("");
    expect(signal.fetchOk).toBe(false);
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
