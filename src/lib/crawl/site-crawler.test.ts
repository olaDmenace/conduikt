// @vitest-environment node
import { describe, expect, it } from "vitest";
import { crawlSite, normaliseLink, parsePage } from "./site-crawler";
import { isAllowed, parseRobots, robotsInfo } from "./robots";
import { crawlUnreachable } from "./unreachable";

type Routes = Record<string, string | { status: number; body?: string; headers?: Record<string, string> } | { throws: Error }>;

function fakeFetch(routes: Routes, log: string[] = []) {
  return async (url: string): Promise<Response> => {
    log.push(url);
    const hit = routes[url];
    if (hit === undefined) return new Response("not found", { status: 404 });
    if (typeof hit === "string") return new Response(hit, { status: 200, headers: { "content-type": "text/html" } });
    if ("throws" in hit) throw hit.throws;
    return new Response(hit.body ?? "", { status: hit.status, headers: hit.headers });
  };
}

const page = (title: string, links: string[] = [], extra = "") =>
  `<html><head><title>${title}</title><meta name="description" content="About ${title}"></head>
   <body><nav><a href="/">Home</a></nav><h1>${title}</h1><h2>What is ${title}?</h2><p>Body of ${title}.</p>
   ${links.map((l) => `<a href="${l}">${l}</a>`).join("")}${extra}<footer>foot</footer></body></html>`;

describe("crawlSite", () => {
  it("reads the sitemap first and parses each page", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": { status: 404 },
      "https://example.com/sitemap.xml": `<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/services/plumbing</loc></url><url><loc>https://other.com/x</loc></url></urlset>`,
      "https://example.com/": page("Home"),
      "https://example.com/services/plumbing": page("Plumbing"),
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.source).toBe("sitemap");
    expect(result.pages.map((p) => p.url).sort()).toEqual(["https://example.com/", "https://example.com/services/plumbing"]);
    const plumbing = result.pages.find((p) => p.url.endsWith("plumbing"))!;
    expect(plumbing.title).toBe("Plumbing");
    expect(plumbing.h1).toBe("Plumbing");
    expect(plumbing.metaDescription).toBe("About Plumbing");
    expect(plumbing.headings).toEqual(["Plumbing", "What is Plumbing?"]);
    expect(plumbing.textExcerpt).toContain("Body of Plumbing");
    expect(plumbing.textExcerpt).not.toContain("foot");
    expect(result.robots.fetched).toBe(false);
  });

  it("follows a sitemap index", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": { status: 404 },
      "https://example.com/sitemap.xml": `<sitemapindex><sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap></sitemapindex>`,
      "https://example.com/sitemap-pages.xml": `<urlset><url><loc>https://example.com/about</loc></url></urlset>`,
      "https://example.com/about": page("About"),
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.source).toBe("sitemap");
    expect(result.pages.map((p) => p.url)).toEqual(["https://example.com/about"]);
  });

  it("walks internal links when there is no sitemap, same host only", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": { status: 404 },
      "https://example.com/sitemap.xml": { status: 404 },
      "https://example.com/": page("Home", ["/about", "/contact#top", "https://twitter.com/x", "/brochure.pdf", "mailto:a@b.c"]),
      "https://example.com/about": page("About", ["/team"]),
      "https://example.com/contact": page("Contact"),
      "https://example.com/team": page("Team"),
    };
    const log: string[] = [];
    const result = await crawlSite("example.com", { fetchImpl: fakeFetch(routes, log) });
    expect(result.source).toBe("links");
    expect(result.pages.map((p) => p.url).sort()).toEqual([
      "https://example.com/",
      "https://example.com/about",
      "https://example.com/contact",
      "https://example.com/team",
    ]);
    expect(log.some((u) => u.includes("twitter.com") || u.endsWith(".pdf"))).toBe(false);
  });

  it("stops at the page cap", async () => {
    const routes: Routes = { "https://example.com/robots.txt": { status: 404 }, "https://example.com/sitemap.xml": { status: 404 } };
    const links = Array.from({ length: 30 }, (_, i) => `/p${i}`);
    routes["https://example.com/"] = page("Home", links);
    for (const l of links) routes[`https://example.com${l}`] = page(l);
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes), maxPages: 5 });
    expect(result.pages.length).toBe(5);
  });

  it("respects robots.txt for ConduiktBot and reports blocked AI crawlers", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": `User-agent: *\nDisallow: /private\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nAllow: /`,
      "https://example.com/sitemap.xml": `<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/private/x</loc></url></urlset>`,
      "https://example.com/": page("Home"),
      "https://example.com/private/x": page("Secret"),
    };
    const log: string[] = [];
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes, log) });
    expect(result.pages.map((p) => p.url)).toEqual(["https://example.com/"]);
    expect(log).not.toContain("https://example.com/private/x");
    expect(result.robots.fetched).toBe(true);
    expect(result.robots.aiCrawlersBlocked.GPTBot).toBe(true);
    expect(result.robots.aiCrawlersBlocked.ClaudeBot).toBe(false);
    expect(result.robots.aiCrawlersBlocked.PerplexityBot).toBe(false);
    expect(result.robots.disallowForUs).toEqual(["/private"]);
    expect(result.fetchedAny).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it("reports a site whose bot protection answered every request as blocked, not empty", async () => {
    const challenge = { status: 403, body: "<html><head><title>Just a moment...</title></head></html>", headers: { "cf-mitigated": "challenge" } };
    const routes: Routes = {
      "https://example.com/robots.txt": challenge,
      "https://example.com/sitemap.xml": challenge,
      "https://example.com/": challenge,
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.pages).toEqual([]);
    expect(result.source).toBe("none");
    expect(result.blocked).toBe(true);
    expect(result.fetchedAny).toBe(false);
    expect(result.failedStatus).toBe(403);
    expect(result.errors).toContain("https://example.com/: 403 blocked by bot protection");
  });

  it("records a per-URL status for pages that fail while others are read", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": { status: 404 },
      "https://example.com/sitemap.xml": `<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/gone</loc></url><url><loc>https://example.com/busy</loc></url></urlset>`,
      "https://example.com/": page("Home"),
      "https://example.com/gone": { status: 500, body: "server error" },
      "https://example.com/busy": { status: 503, body: "<title>Just a moment...</title>" },
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.pages.map((p) => p.url)).toEqual(["https://example.com/"]);
    expect(result.fetchedAny).toBe(true);
    expect(result.blocked).toBe(true);
    expect(result.errors).toContain("https://example.com/gone: 500");
    expect(result.errors).toContain("https://example.com/busy: 503 blocked by bot protection");
    expect(result.errors.some((e) => e.startsWith("https://example.com/robots.txt: 404"))).toBe(true);
  });

  it("records a timeout as such and leaves blocked off", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    const routes: Routes = {
      "https://example.com/robots.txt": { throws: timeout },
      "https://example.com/sitemap.xml": { throws: timeout },
      "https://example.com/": { throws: timeout },
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.pages).toEqual([]);
    expect(result.blocked).toBe(false);
    expect(result.fetchedAny).toBe(false);
    expect(result.failedStatus).toBeNull();
    expect(result.failedError).toBe("timed out");
    expect(result.errors).toContain("https://example.com/: timed out");
    expect(crawlUnreachable(result)).toBe(true);
  });

  it("is unreachable when robots.txt and the sitemap answer from the edge but every page times out", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    const routes: Routes = {
      "https://example.com/robots.txt": "User-agent: *\nAllow: /",
      "https://example.com/sitemap.xml": `<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/pricing</loc></url></urlset>`,
      "https://example.com/": { throws: timeout },
      "https://example.com/pricing": { throws: timeout },
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.pages).toEqual([]);
    expect(result.robots.fetched).toBe(true);
    // The sitemap's 200 says nothing about the pages.
    expect(result.fetchedAny).toBe(false);
    expect(result.blocked).toBe(false);
    expect(result.failedStatus).toBeNull();
    expect(result.failedError).toBe("timed out");
    expect(crawlUnreachable(result)).toBe(true);
  });

  it("is unreachable when the edge serves robots.txt and the sitemap but the origin answers every page with 500", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": "User-agent: *\nAllow: /",
      "https://example.com/sitemap.xml": `<urlset><url><loc>https://example.com/</loc></url></urlset>`,
      "https://example.com/": { status: 500, body: "server error" },
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.pages).toEqual([]);
    expect(result.fetchedAny).toBe(false);
    expect(result.blocked).toBe(false);
    expect(result.failedStatus).toBe(500);
    expect(crawlUnreachable(result)).toBe(true);
  });

  it("does not call a site blocked when only robots.txt was refused and the pages simply 404", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": { status: 403, body: "forbidden" },
      "https://example.com/sitemap.xml": { status: 404 },
      // The home page is missing too, so nothing was read.
    };
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes) });
    expect(result.pages).toEqual([]);
    expect(result.blocked).toBe(false);
    expect(result.failedStatus).toBe(404);
    expect(result.errors).toContain("https://example.com/robots.txt: 403 blocked by bot protection");
    expect(crawlUnreachable(result)).toBe(true);
  });

  it("is not unreachable when robots.txt disallows every page: no page request failed", async () => {
    const routes: Routes = {
      "https://example.com/robots.txt": "User-agent: ConduiktBot\nDisallow: /",
      "https://example.com/sitemap.xml": `<urlset><url><loc>https://example.com/</loc></url></urlset>`,
      "https://example.com/": page("Home"),
    };
    const log: string[] = [];
    const result = await crawlSite("https://example.com", { fetchImpl: fakeFetch(routes, log) });
    expect(result.pages).toEqual([]);
    expect(log).not.toContain("https://example.com/");
    expect(result.blocked).toBe(false);
    expect(result.failedStatus).toBeNull();
    expect(result.failedError).toBeNull();
    expect(crawlUnreachable(result)).toBe(false);
  });

  it("reports an address that cannot be parsed as not read", async () => {
    const result = await crawlSite("http://exa mple .com/not a url", { fetchImpl: fakeFetch({}) });
    expect(result.pages).toEqual([]);
    expect(result.errors).toEqual(["Not a valid address"]);
    expect(crawlUnreachable(result)).toBe(true);
  });
});

describe("robots helpers", () => {
  it("longest match wins between allow and disallow", () => {
    const g = parseRobots("User-agent: *\nDisallow: /a\nAllow: /a/b");
    expect(isAllowed(g, "ConduiktBot", "/a/x")).toBe(false);
    expect(isAllowed(g, "ConduiktBot", "/a/b/c")).toBe(true);
    expect(isAllowed(g, "ConduiktBot", "/z")).toBe(true);
  });

  it("treats an empty Disallow as allow-all", () => {
    expect(robotsInfo("User-agent: *\nDisallow:").aiCrawlersBlocked.GPTBot).toBe(false);
  });
});

describe("helpers", () => {
  it("normaliseLink drops hashes, queries and trailing slashes", () => {
    const base = new URL("https://example.com/");
    expect(normaliseLink("/a/?x=1#y", base)).toBe("https://example.com/a");
    expect(normaliseLink("https://EXAMPLE.com/b", base)).toBe("https://example.com/b");
    expect(normaliseLink("https://cdn.example.com/b", base)).toBeNull();
  });

  it("parsePage keeps html only when asked", () => {
    expect(parsePage("https://e.com", "<h1>Hi</h1>").html).toBeUndefined();
    expect(parsePage("https://e.com", "<h1>Hi</h1>", true).html).toBe("<h1>Hi</h1>");
  });
});
