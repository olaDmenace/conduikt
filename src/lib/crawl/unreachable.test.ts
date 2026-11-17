// @vitest-environment node
import { describe, expect, it } from "vitest";
import { crawlUnreachable, crawlUnreachableMessage, hostLabel, isTimeoutError, looksBlocked, SITE_UNREACHABLE, siteUnreachableMessage } from "./unreachable";

describe("looksBlocked", () => {
  it("treats any 403 as bot protection", () => {
    expect(looksBlocked(403, new Headers(), "")).toBe(true);
  });

  it("needs a challenge marker on 429 and 503", () => {
    expect(looksBlocked(503, new Headers(), "<html><body>down for maintenance</body></html>")).toBe(false);
    expect(looksBlocked(503, new Headers({ "cf-mitigated": "challenge" }), "")).toBe(true);
    expect(looksBlocked(429, new Headers(), "<html><head><title>Just a moment...</title></head></html>")).toBe(true);
    expect(looksBlocked(503, new Headers(), "<html><head><title>Attention Required! | Cloudflare</title></head></html>")).toBe(true);
    expect(looksBlocked(503, new Headers(), `<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/jsch/v1"></script>`)).toBe(true);
  });

  it("never flags a success, a 404 or a 500", () => {
    expect(looksBlocked(200, new Headers({ "cf-mitigated": "challenge" }), "")).toBe(false);
    expect(looksBlocked(404, new Headers(), "<title>Just a moment...</title>")).toBe(false);
    expect(looksBlocked(500, new Headers(), "")).toBe(false);
    expect(looksBlocked(null, new Headers(), "")).toBe(false);
  });

  it("copes with a response that has no headers object", () => {
    expect(looksBlocked(429, undefined, "<title>Just a moment...</title>")).toBe(true);
    expect(looksBlocked(429, null, "")).toBe(false);
  });
});

describe("siteUnreachableMessage", () => {
  it("names the host and status and says what to allow when bot protection answered", () => {
    expect(siteUnreachableMessage({ blocked: true, status: 403, host: "acme.com" })).toBe(
      "We couldn't read acme.com (status 403). It looks like your site's bot protection blocked us. Allow the user agent ConduiktBot and try again."
    );
  });

  it("says timed out when there was no response", () => {
    expect(siteUnreachableMessage({ blocked: false, status: null, host: "acme.com", error: "timed out" })).toBe(
      "We couldn't read acme.com right now (timed out). Try again in a few minutes."
    );
    expect(siteUnreachableMessage({ blocked: false, status: null, host: "acme.com", error: "ECONNREFUSED" })).toContain("(no response)");
  });

  it("carries a plain status when the server answered with an error", () => {
    expect(siteUnreachableMessage({ blocked: false, status: 500, host: "acme.com" })).toBe(
      "We couldn't read acme.com right now (status 500). Try again in a few minutes."
    );
  });

  it("exports the one error code", () => {
    expect(SITE_UNREACHABLE).toBe("site_unreachable");
  });
});

describe("crawl helpers", () => {
  const base = { pages: [], blocked: false, failedStatus: null, failedError: null };

  it("is unreachable when no page was read and a page request failed, whatever robots.txt and the sitemap said", () => {
    // A challenge, an error status or a timeout on a page request with nothing read.
    expect(crawlUnreachable({ ...base, blocked: true })).toBe(true);
    expect(crawlUnreachable({ ...base, failedStatus: 500 })).toBe(true);
    expect(crawlUnreachable({ ...base, failedStatus: 404 })).toBe(true);
    expect(crawlUnreachable({ ...base, failedError: "timed out" })).toBe(true);
  });

  it("is not unreachable when no page request failed (robots-disallowed, nothing to read) or a page was read", () => {
    expect(crawlUnreachable(base)).toBe(false);
    expect(crawlUnreachable({ ...base, pages: [{}], blocked: true })).toBe(false);
    expect(crawlUnreachable({ ...base, pages: [{}], failedStatus: 500, failedError: "timed out" })).toBe(false);
  });

  it("builds the message from the crawl and the site address", () => {
    expect(crawlUnreachableMessage({ ...base, blocked: true, failedStatus: 403 }, "https://www.acme.com/")).toContain("We couldn't read acme.com (status 403)");
    expect(crawlUnreachableMessage({ ...base, failedError: "timed out" }, "acme.com")).toContain("(timed out)");
  });

  it("hostLabel drops the scheme and www", () => {
    expect(hostLabel("https://www.acme.com/about")).toBe("acme.com");
    expect(hostLabel("acme.com")).toBe("acme.com");
    expect(hostLabel("::nope")).toBe("::nope");
  });

  it("isTimeoutError recognises the abort from AbortSignal.timeout", () => {
    const err = new Error("The operation was aborted due to timeout");
    err.name = "TimeoutError";
    expect(isTimeoutError(err)).toBe(true);
    expect(isTimeoutError(new Error("ECONNREFUSED"))).toBe(false);
    expect(isTimeoutError("nope")).toBe(false);
  });
});
