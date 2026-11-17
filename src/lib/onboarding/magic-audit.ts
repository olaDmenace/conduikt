/**
 * Magic Audit — the "first 60 seconds" activation flow.
 *
 * Takes a URL, fetches its HTML, extracts a minimal brand signal, then
 * asks Claude to produce (in one structured call): an SEO score, the
 * top 3 issues, an inferred brand voice, and 3 ready-to-post LinkedIn
 * drafts tailored to that voice.
 *
 * Split into pure helpers so the API route stays thin and every stage
 * is unit-testable in isolation without hitting the network / Anthropic.
 */

import { generateWithClaude } from "@/src/lib/ai/client";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import { CRAWL_HEADERS } from "@/src/lib/crawl/site-crawler";
import { hostLabel, isTimeoutError, looksBlocked, siteUnreachableMessage } from "@/src/lib/crawl/unreachable";
export { normalizeAuditUrl } from "./url";

/** Minimal signal extracted from a fetched HTML page. */
export interface PageSignal {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  bodyText: string;
  /** Raw HTML, capped at 60k chars, for agents that read the markup. */
  html?: string;
  /** The page came back readable: a 2xx with a non-empty body. Never true with an empty `html`. */
  fetchOk: boolean;
  /** The response status, or null when there was no response (timeout, refused). */
  fetchStatus: number | null;
  /** Why the page could not be read, in a few words; null when it was. */
  fetchError: string | null;
  /** The site's bot protection answered instead of the page. */
  blocked: boolean;
}

/** The sentence for a signal that could not be read. */
export function signalUnreachableMessage(signal: Pick<PageSignal, "url" | "blocked" | "fetchStatus" | "fetchError">): string {
  return siteUnreachableMessage({ blocked: signal.blocked, status: signal.fetchStatus, host: hostLabel(signal.url), error: signal.fetchError });
}

export interface MagicAuditResult {
  seoScore: number; // 0-100
  seoGrade: "A" | "B" | "C" | "D" | "F";
  topIssues: string[]; // up to 3 concrete fixes
  brandVoice: {
    tone: string; // "confident, technical, warm"
    audience: string;
    valueProposition: string;
  };
  sampleLinkedInPosts: Array<{
    angle: string;
    text: string;
  }>;
}

/**
 * Fetch a URL and extract the tiny slice of signal we actually need.
 * Deliberately simple regex extraction — a full DOM parser would drag
 * in a heavy dep and buy us little for the four fields we use. Never
 * throws: when the page could not be read the signal says so
 * (`fetchOk: false`, with the status or error and whether bot protection
 * answered), so no caller mistakes an unreadable site for an empty one.
 */
export async function fetchPageSignal(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<PageSignal> {
  let html = "";
  let fetchOk = false;
  let fetchStatus: number | null = null;
  let fetchError: string | null = null;
  let blocked = false;
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      // The same identity as the crawler, so an owner who allows
      // ConduiktBot once has allowed every read we make.
      headers: CRAWL_HEADERS,
      // 10s timeout — most reasonable pages respond in <2s; anything
      // slower is either broken or bot-blocking us.
      signal: AbortSignal.timeout(10_000),
    });
    fetchStatus = typeof res.status === "number" ? res.status : res.ok ? 200 : null;
    if (res.ok) {
      html = await res.text();
      // A 200 with nothing in it (a soft block, a broken origin, a redirect
      // chain ending on an empty page) is not a page we read. Scoring it
      // would report "no title, no H1, no content" about a site we never saw.
      fetchOk = html.trim().length > 0;
      if (!fetchOk) fetchError = "empty response";
    } else {
      const body = await res.text().catch(() => "");
      blocked = looksBlocked(fetchStatus, res.headers, body);
      fetchError = blocked ? `${fetchStatus} blocked by bot protection` : `status ${fetchStatus}`;
    }
  } catch (err) {
    fetchError = err instanceof Error ? (isTimeoutError(err) ? "timed out" : err.message) : "failed";
  }

  const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  // Meta uses a backreferenced quote so that a single quote inside a
  // double-quoted content attribute (or vice-versa) doesn't terminate
  // the match early — real page copy contains apostrophes.
  const metaMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=(["'])((?:(?!\1)[\s\S])*)\1/i
  );
  const meta = metaMatch?.[2] ?? null;
  const h1 = matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  // Body text — strip tags + scripts/styles, cap at ~4000 chars so the
  // downstream LLM prompt stays lean. Order matters: strip block-level
  // content before generic tags.
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  return {
    url,
    title: title ? decodeEntities(title.trim()) : null,
    metaDescription: meta ? decodeEntities(meta.trim()) : null,
    h1: h1 ? decodeEntities(h1.trim()) : null,
    bodyText,
    html: html.slice(0, 60_000),
    fetchOk,
    fetchStatus,
    fetchError,
    blocked,
  };
}

function matchFirst(source: string, re: RegExp): string | null {
  const m = source.match(re);
  return m?.[1] ?? null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Turn a numeric score into a grade for the UI. */
export function scoreToGrade(score: number): MagicAuditResult["seoGrade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}


const SYSTEM_PROMPT = `You are Conduikt's Magic Audit — a compact analyzer that turns a single URL into an immediately-useful onboarding payload.

Your response MUST be a single valid JSON object matching this exact TypeScript type:

{
  "seoScore": number,              // 0-100 integer, calibrated against modern SEO best practice
  "topIssues": string[],           // exactly 3 concrete, actionable fixes — each < 120 chars
  "brandVoice": {
    "tone": string,                // e.g. "warm, technical, plainspoken" — 3-5 comma-separated adjectives
    "audience": string,            // who they seem to be built for — one sentence
    "valueProposition": string     // what they promise the reader — one sentence
  },
  "sampleLinkedInPosts": [         // exactly 3 posts
    { "angle": string, "text": string }
  ]
}

Rules:
- Sample posts write in the brand voice you inferred. Each 800-1400 chars, first-person plural, no hashtags, no emojis unless the brand clearly uses them.
- Angles should differ: e.g. "founder story", "customer pain", "counter-intuitive take".
- Do not invent statistics or features not visible in the page content.
- Do not include markdown, prose, or code fences — just the JSON.`;

function buildUserPrompt(signal: PageSignal): string {
  return `URL: ${signal.url}

TITLE: ${signal.title ?? "(not found)"}
META DESCRIPTION: ${signal.metaDescription ?? "(not found)"}
H1: ${signal.h1 ?? "(not found)"}

BODY EXCERPT (first ~4000 chars, tags stripped):
${signal.bodyText || "(page returned no readable content)"}

Return the JSON payload as specified in the system prompt.`;
}

/**
 * Run the LLM step of the Magic Audit given an already-fetched signal.
 * Split out from the fetch so tests can drive this deterministically
 * with a fixture signal.
 */
export async function analyzeMagicAudit(
  signal: PageSignal
): Promise<MagicAuditResult> {
  const { content } = await generateWithClaude({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(signal),
    maxTokens: 4000,
  });

  const parsed = parseJsonResponse(content) as Partial<MagicAuditResult>;

  // Defensive normalization — the LLM is usually well-behaved with
  // this system prompt but we still validate the shape and clamp
  // ranges rather than trust it blindly.
  const seoScore = clampScore(parsed.seoScore);
  const topIssues = Array.isArray(parsed.topIssues)
    ? parsed.topIssues.slice(0, 3).filter((s): s is string => typeof s === "string")
    : [];
  const brandVoice = {
    tone: typeof parsed.brandVoice?.tone === "string" ? parsed.brandVoice.tone : "unclear",
    audience:
      typeof parsed.brandVoice?.audience === "string"
        ? parsed.brandVoice.audience
        : "unclear",
    valueProposition:
      typeof parsed.brandVoice?.valueProposition === "string"
        ? parsed.brandVoice.valueProposition
        : "unclear",
  };
  const sampleLinkedInPosts = Array.isArray(parsed.sampleLinkedInPosts)
    ? parsed.sampleLinkedInPosts
        .slice(0, 3)
        .filter(
          (p): p is { angle: string; text: string } =>
            !!p && typeof p.angle === "string" && typeof p.text === "string"
        )
    : [];

  return {
    seoScore,
    seoGrade: scoreToGrade(seoScore),
    topIssues,
    brandVoice,
    sampleLinkedInPosts,
  };
}

function clampScore(n: unknown): number {
  const num = typeof n === "number" ? n : 0;
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}
