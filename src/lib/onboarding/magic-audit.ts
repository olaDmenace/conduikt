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

/** Minimal signal extracted from a fetched HTML page. */
export interface PageSignal {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  bodyText: string;
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
 * in a heavy dep and buy us little for the four fields we use. Fails
 * open (returns nulls) rather than throwing.
 */
export async function fetchPageSignal(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<PageSignal> {
  let html = "";
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        // A generic UA — some hosts serve minimal HTML to unknown bots
        // and full HTML to browsers. Adjust if we see empty responses.
        "User-Agent":
          "Mozilla/5.0 (compatible; Conduikt/1.0; +https://conduikt.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      // 10s timeout — most reasonable pages respond in <2s; anything
      // slower is either broken or bot-blocking us.
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) html = await res.text();
  } catch {
    // Swallow — we'll return the signal with all-null fields so the
    // downstream LLM call still runs on just the URL.
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

/** Compact URL validator — accepts anything that parses as an http(s) URL. */
export function normalizeAuditUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Auto-prepend https:// if the user typed just a domain
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
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
    temperature: 0.5,
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
