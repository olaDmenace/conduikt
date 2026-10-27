// Site crawler for Missing Pages. Reads the sitemap first (index or
// plain), else walks internal links from the home page. Same host only,
// at most 50 pages, four at a time, 8 seconds each, honouring robots.txt
// for "ConduiktBot". Every outbound request goes through safeFetch so a
// customer URL can never point us at a private address.

import { safeFetch } from "@/src/lib/security/safe-fetch";
import {
  extractH1,
  extractHeadings,
  extractHrefs,
  extractMetaDescription,
  extractTitle,
  extractVisibleText,
} from "./html";
import { isAllowed, OUR_USER_AGENT, parseRobots, robotsInfo, type RobotsInfo } from "./robots";

export type { RobotsInfo } from "./robots";

export interface CrawledPage {
  url: string;
  title: string | null;
  h1: string | null;
  metaDescription: string | null;
  /** First ~1,500 characters of visible text. */
  textExcerpt: string;
  headings: string[];
  /** Raw HTML (capped) when the caller asked for it. */
  html?: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  robots: RobotsInfo;
  source: "sitemap" | "links" | "none";
  errors: string[];
}

export interface CrawlOptions {
  maxPages?: number;
  concurrency?: number;
  timeoutMs?: number;
  /** Keep the raw HTML on each page (for readiness checks). */
  keepHtml?: boolean;
  /** Test seam. Defaults to safeFetch. */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
}

const SKIP_EXT = /\.(?:pdf|jpe?g|png|gif|webp|svg|ico|css|js|mjs|json|xml|zip|gz|mp4|mp3|woff2?|ttf|eot|txt|csv|docx?|xlsx?|pptx?)$/i;

const HEADERS = {
  "User-Agent": `Mozilla/5.0 (compatible; ${OUR_USER_AGENT}/1.0; +https://conduikt.com)`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
};

/** Normalise a link found on `base`; null when it leaves the site or isn't a page. */
export function normaliseLink(href: string, base: URL): string | null {
  if (!href || href.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(href)) return null;
  let u: URL;
  try {
    u = new URL(href, base);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.hostname.toLowerCase() !== base.hostname.toLowerCase()) return null;
  if (SKIP_EXT.test(u.pathname)) return null;
  u.hash = "";
  u.search = "";
  u.hostname = u.hostname.toLowerCase();
  let s = u.toString();
  if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
  return s;
}

export function parsePage(url: string, html: string, keepHtml = false): CrawledPage {
  return {
    url,
    title: extractTitle(html),
    h1: extractH1(html),
    metaDescription: extractMetaDescription(html),
    textExcerpt: extractVisibleText(html, 1500),
    headings: extractHeadings(html).slice(0, 40),
    ...(keepHtml ? { html: html.slice(0, 60_000) } : {}),
  };
}

/** Fetch and parse one page (for 'update' candidates outside a full crawl). Null on failure. */
export async function fetchPage(url: string, opts: Pick<CrawlOptions, "timeoutMs" | "keepHtml" | "fetchImpl"> = {}): Promise<CrawledPage | null> {
  const fetchImpl = opts.fetchImpl ?? ((u: string, init?: RequestInit) => safeFetch(u, init));
  try {
    const res = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(opts.timeoutMs ?? 8000) });
    if (!res.ok) return null;
    return parsePage(url, await res.text(), opts.keepHtml);
  } catch {
    return null;
  }
}

function locsOf(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

export async function crawlSite(siteUrl: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = opts.maxPages ?? 50;
  const concurrency = opts.concurrency ?? 4;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const fetchImpl = opts.fetchImpl ?? ((u: string, init?: RequestInit) => safeFetch(u, init));
  const errors: string[] = [];

  let base: URL;
  try {
    base = new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`);
  } catch {
    return { pages: [], robots: robotsInfo(null), source: "none", errors: ["Not a valid address"] };
  }
  const origin = base.origin;

  const getText = async (url: string): Promise<string | null> => {
    try {
      const res = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) return null;
      return await res.text();
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : "failed"}`);
      return null;
    }
  };

  // 1. robots.txt
  const robotsText = await getText(`${origin}/robots.txt`);
  const groups = robotsText === null ? [] : parseRobots(robotsText);
  const robots = robotsInfo(robotsText);
  const allowed = (url: string) => isAllowed(groups, OUR_USER_AGENT, new URL(url).pathname);

  // 2. sitemap.xml (index or plain)
  const seeds: string[] = [];
  let source: CrawlResult["source"] = "none";
  const sitemapXml = await getText(`${origin}/sitemap.xml`);
  if (sitemapXml) {
    const locs = locsOf(sitemapXml);
    const isIndex = /<sitemapindex/i.test(sitemapXml);
    const pageLocs: string[] = [];
    if (isIndex) {
      for (const child of locs.slice(0, 5)) {
        const sameHost = (() => {
          try {
            return new URL(child).hostname.toLowerCase() === base.hostname.toLowerCase();
          } catch {
            return false;
          }
        })();
        const childXml = sameHost ? await getText(child) : null;
        if (childXml) pageLocs.push(...locsOf(childXml));
        if (pageLocs.length >= maxPages) break;
      }
    } else {
      pageLocs.push(...locs);
    }
    for (const loc of pageLocs) {
      const n = normaliseLink(loc, base);
      if (n && !seeds.includes(n)) seeds.push(n);
      if (seeds.length >= maxPages) break;
    }
    if (seeds.length > 0) source = "sitemap";
  }

  const home = normaliseLink("/", base) ?? origin;
  if (source === "none") {
    seeds.push(home);
    source = "links";
  }
  const followLinks = source === "links";

  // 3. fetch pages with a small worker pool
  const seen = new Set<string>(seeds);
  const queue = [...seeds];
  const pages: CrawledPage[] = [];
  let fetched = 0;
  let active = 0;

  // Workers idle briefly instead of exiting while a sibling may still be
  // discovering links; otherwise the BFS path would run single-file.
  const worker = async () => {
    while (fetched < maxPages) {
      const url = queue.shift();
      if (!url) {
        if (active === 0) return;
        await new Promise((r) => setTimeout(r, 20));
        continue;
      }
      if (!allowed(url)) continue;
      fetched++;
      active++;
      try {
        const html = await getText(url);
        if (html === null) continue;
        pages.push(parsePage(url, html, opts.keepHtml));
        if (followLinks) {
          for (const href of extractHrefs(html)) {
            const n = normaliseLink(href, base);
            if (n && !seen.has(n) && seen.size < maxPages * 4) {
              seen.add(n);
              queue.push(n);
            }
          }
        }
      } finally {
        active--;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  return { pages, robots, source: pages.length === 0 && source === "links" ? "none" : source, errors };
}
