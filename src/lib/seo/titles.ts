// Title and heading rewrites (audit §5.4 #3). The site is crawled (up to
// 30 pages), the model proposes one answer-first <title> (60 characters
// or fewer) and one H1 per page, and the proposal is stored as an asset of
// type "seo_titles" so the owner can accept rows and apply them. The pure
// parts live here: the prompt, the parser, and the WordPress apply step
// (title only, sent as a partial update: WordPress prints the title as the
// H1 in nearly every theme, and the REST client has no separate heading
// field).

import { z } from "zod";
import type { CrawledPage } from "@/src/lib/crawl/site-crawler";
import type { ProjectFacts } from "@/src/lib/missing-pages/types";
import { normaliseBaseUrl, type WordPressConnection } from "@/src/lib/integrations/wordpress";
import { safeFetch } from "@/src/lib/security/safe-fetch";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";

export const MAX_TITLE_PAGES = 30;
export const MAX_TITLE_CHARS = 60;
export const MAX_H1_CHARS = 90;

export interface TitleProposalRow {
  url: string;
  currentTitle: string | null;
  currentH1: string | null;
  proposedTitle: string;
  proposedH1: string;
  /** One line on what changed and why, in plain words. */
  reason: string;
  /** Owner's decision; false until they tick it. */
  accepted: boolean;
  /** Set once it has gone to WordPress. */
  appliedAt?: string | null;
}

export interface TitleProposal {
  siteUrl: string;
  pagesRead: number;
  generatedAt: string;
  rows: TitleProposalRow[];
}

const SLOGAN_WORDS = /\b(welcome to|home|the best|#1|number one|leading|premier|world[- ]class|your trusted|solutions?)\b/i;

export function titlesSystemPrompt(facts: ProjectFacts): string {
  const where = facts.location ? ` in ${facts.location}` : "";
  const services = facts.services.length ? facts.services.join(", ") : facts.category ?? "what it offers";
  return `You rewrite page titles and main headings for ${facts.name}, a ${facts.businessType === "local" ? "local business" : "business"}${where} offering ${services}.

For every page you are given, write one <title> and one H1 that:
- say what the page answers, in the words a person would type into a search box, with the main point first
- keep the page's own topic (never swap one page's subject for another's)
- name the business where it fits (usually the title, after a separator), and the place when the page is about a place or a local service
- are plain and specific: no slogans, no "Welcome to", no "Home", no "#1", no "solutions", no exclamation marks
- title: at most ${MAX_TITLE_CHARS} characters including spaces; h1: at most ${MAX_H1_CHARS} characters, a full phrase, not a copy of the title
- if the current title is already good, keep it and say so in the reason

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "pages": [
    { "url": "https://...", "title": "...", "h1": "...", "reason": "one plain sentence" }
  ]
}
Include every url you were given exactly once, spelled exactly as given.`;
}

export function titlesUserPrompt(pages: CrawledPage[]): string {
  const lines = pages.slice(0, MAX_TITLE_PAGES).map((p, i) => {
    const excerpt = p.textExcerpt.replace(/\s+/g, " ").trim().slice(0, 240);
    return `${i + 1}. url: ${p.url}\n   title: ${p.title ?? "(none)"}\n   h1: ${p.h1 ?? "(none)"}\n   headings: ${p.headings.slice(0, 6).join(" | ") || "(none)"}\n   text: ${excerpt || "(none)"}`;
  });
  return `Pages (${lines.length}):\n\n${lines.join("\n\n")}`;
}

const responseSchema = z.object({
  pages: z.array(
    z.object({
      url: z.string().min(1),
      title: z.string().min(1),
      h1: z.string().min(1).optional(),
      reason: z.string().optional(),
    })
  ),
});

function tidy(s: string): string {
  return s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/!+/g, "").replace(/\s+/g, " ").trim();
}

/** Cut at a word boundary, never mid-word, never longer than max. */
export function clampAtWord(s: string, max: number): string {
  const t = tidy(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max).replace(/[\s|:,;–-]+\S*$/, "").trim();
  return cut || t.slice(0, max).trim();
}

/** Loose URL match: scheme, trailing slash and case of the host do not matter. */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}

/**
 * Turn the model's answer into rows, one per crawled page. Pages the model
 * skipped keep their current title; sloganeering titles are left out of
 * the proposal (the current one stands) so a bad suggestion never gets
 * applied by a tick in a hurry.
 */
export function parseTitlesResponse(raw: string, pages: CrawledPage[]): TitleProposalRow[] {
  const parsed = responseSchema.parse(parseJsonResponse(raw));
  const byUrl = new Map(parsed.pages.map((p) => [urlKey(p.url), p]));
  return pages.slice(0, MAX_TITLE_PAGES).map((page) => {
    const hit = byUrl.get(urlKey(page.url));
    const currentTitle = page.title?.trim() || null;
    const currentH1 = page.h1?.trim() || null;
    let proposedTitle = hit ? clampAtWord(hit.title, MAX_TITLE_CHARS) : currentTitle ?? "";
    let proposedH1 = hit?.h1 ? clampAtWord(hit.h1, MAX_H1_CHARS) : currentH1 ?? proposedTitle;
    let reason = hit?.reason ? tidy(hit.reason) : "No change suggested.";
    if (SLOGAN_WORDS.test(proposedTitle) && currentTitle) {
      proposedTitle = currentTitle;
      reason = "The suggestion read like a slogan, so the current title stands.";
    }
    if (!proposedTitle) proposedTitle = currentTitle ?? proposedH1;
    if (!proposedH1) proposedH1 = proposedTitle;
    return { url: page.url, currentTitle, currentH1, proposedTitle, proposedH1, reason, accepted: false };
  });
}

/** A row is a change when the title or the H1 differs from what is live. */
export function rowChanges(row: Pick<TitleProposalRow, "currentTitle" | "currentH1" | "proposedTitle" | "proposedH1">): boolean {
  return (row.currentTitle ?? "").trim() !== row.proposedTitle.trim() || (row.currentH1 ?? "").trim() !== row.proposedH1.trim();
}

/** The WordPress page slug for a URL: the last path segment ("" for the home page). */
export function slugFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return "";
  }
}

export interface ApplyTitlesResult {
  applied: Array<{ url: string; title: string; link: string }>;
  failed: Array<{ url: string; error: string }>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Apply accepted titles to a WordPress site. Each page is found by slug and
 * then updated with `{ title }` alone: the REST API accepts a partial
 * update, so the body, excerpt and status are never sent back and can
 * never be wiped (a read that returns no `content.raw`, as happens with
 * limited roles, REST filters and page builders, used to come back as an
 * empty body). A page whose slug is not found is reported, not created.
 * The home page (no slug) cannot be addressed by slug and is reported as
 * failed with a reason the owner can act on.
 */
export async function applyTitlesToWordPress(
  conn: WordPressConnection,
  rows: Array<{ url: string; title: string }>,
  fetchImpl: FetchLike = (u, i) => safeFetch(u, i)
): Promise<ApplyTitlesResult> {
  const out: ApplyTitlesResult = { applied: [], failed: [] };
  const base = normaliseBaseUrl(conn.baseUrl);
  const auth = `Basic ${Buffer.from(`${conn.username}:${conn.appPassword}`).toString("base64")}`;

  for (const row of rows) {
    const slug = slugFromUrl(row.url);
    if (!slug) {
      out.failed.push({ url: row.url, error: "The home page title is set in WordPress under Settings, General (Site Title)." });
      continue;
    }
    try {
      const res = await fetchImpl(`${base}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&status=publish,draft,pending,private&per_page=1&context=edit`, {
        method: "GET",
        headers: { Authorization: auth, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`WordPress responded ${res.status} while looking for the page`);
      const existing = ((await res.json().catch(() => [])) as Array<{ id?: number }>)[0];
      if (!existing || typeof existing.id !== "number") throw new Error("No WordPress page has this address");

      // Title only. Nothing else about the page is touched.
      const write = await fetchImpl(`${base}/wp-json/wp/v2/pages/${existing.id}`, {
        method: "POST",
        headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ title: row.title }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!write.ok) {
        const detail = (await write.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message ? `WordPress: ${detail.message}` : `WordPress responded ${write.status}`);
      }
      const saved = (await write.json().catch(() => null)) as { link?: string } | null;
      out.applied.push({ url: row.url, title: row.title, link: saved?.link ?? row.url });
    } catch (err) {
      out.failed.push({ url: row.url, error: err instanceof Error ? err.message : "failed" });
    }
  }
  return out;
}
