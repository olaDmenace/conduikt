// One set of words for "we could not read your site". Every feature that
// reads a customer's website (the site check, the first-week audit, Missing
// Pages, the details check, the titles tool) goes through here so an
// unreadable site is reported as unreadable, never as an empty one.

/** Error code every route returns when the site could not be read. */
export const SITE_UNREACHABLE = "site_unreachable";

/** Statuses a bot challenge answers with. */
const CHALLENGE_STATUSES = new Set([403, 429, 503]);

type HeaderBag = { get(name: string): string | null } | null | undefined;

/**
 * True when a response is a bot challenge rather than the page: a 403,
 * 429 or 503 carrying Cloudflare's `cf-mitigated` header, a challenge
 * title ("Just a moment..." / "Attention Required") or the challenge
 * script in the body. A plain 403 counts too: the server refused a GET of
 * a public page, which is what bot protection does.
 */
export function looksBlocked(status: number | null, headers: HeaderBag, body: string): boolean {
  if (status === null || !CHALLENGE_STATUSES.has(status)) return false;
  if (status === 403) return true;
  let mitigated: string | null = null;
  try {
    mitigated = headers?.get("cf-mitigated") ?? null;
  } catch {
    mitigated = null;
  }
  if (mitigated) return true;
  const head = body.slice(0, 20_000);
  if (/<title[^>]*>\s*(?:just a moment|attention required)/i.test(head)) return true;
  return /challenge-platform/i.test(head);
}

/** Whether a fetch error was the timeout we set, not a refused connection. */
export function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "TimeoutError" || err.name === "AbortError" || /timed? ?out|aborted/i.test(err.message);
}

/** The bare host for a message, without "www." */
export function hostLabel(url: string): string {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export interface SiteUnreachableInput {
  blocked: boolean;
  status: number | null;
  host: string;
  /** The fetch error, when there was no response at all. */
  error?: string | null;
}

/** The sentence the owner sees. Plain words, says what to do next. */
export function siteUnreachableMessage({ blocked, status, host, error }: SiteUnreachableInput): string {
  if (blocked) {
    const code = status ? ` (status ${status})` : "";
    return `We couldn't read ${host}${code}. It looks like your site's bot protection blocked us. Allow the user agent ConduiktBot and try again.`;
  }
  if (status) return `We couldn't read ${host} right now (status ${status}). Try again in a few minutes.`;
  const why = error && /timed? ?out|aborted/i.test(error) ? "timed out" : "no response";
  return `We couldn't read ${host} right now (${why}). Try again in a few minutes.`;
}

/** The shape of a crawl this module reads; the real one is CrawlResult. */
export interface CrawlOutcome {
  pages: unknown[];
  /** A page request answered with a bot challenge. */
  blocked: boolean;
  /** The status of the first failed page request. */
  failedStatus: number | null;
  /** The first page fetch error (timeout, refused connection). */
  failedError: string | null;
}

/**
 * True when a crawl read nothing because the site could not be read, not
 * because it is empty: no page was read and some page request failed (a
 * challenge, an error status, a timeout). A site that disallows us in
 * robots.txt, or whose sitemap lists nothing we may read, fails no page
 * request and stays "no pages". Only page requests count: robots.txt and
 * sitemap.xml answering from a CDN edge says nothing about the pages.
 */
export function crawlUnreachable(crawl: CrawlOutcome): boolean {
  return crawl.pages.length === 0 && (crawl.blocked || crawl.failedStatus !== null || crawl.failedError !== null);
}

/** The message for a crawl that read nothing. */
export function crawlUnreachableMessage(crawl: CrawlOutcome, siteUrl: string): string {
  return siteUnreachableMessage({ blocked: crawl.blocked, status: crawl.failedStatus, host: hostLabel(siteUrl), error: crawl.failedError });
}
