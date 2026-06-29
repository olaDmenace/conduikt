// Analyzer: reads recent posts + their metrics for a project/channel,
// asks Claude to identify patterns that correlate with engagement, and
// upserts the findings into post_learnings.
//
// Designed to be called from:
//   - scripts/loop-closure/analyze-now.mjs (manual one-shot, for prototyping)
//   - an Inngest function scheduled after sync-social-metrics (later)

import { createServiceClient } from "@/src/lib/supabase/service";
import { generateWithClaude } from "@/src/lib/ai/client";
import type { AnalyzerResult, Learning, LearningChannel } from "./types";

const SYSTEM_PROMPT = `You analyze social-media post performance to find patterns that predict engagement.

You will receive a list of recent posts from one channel, each with its text and engagement count. Your job: identify 2-4 ACTIONABLE patterns where one group of posts engages meaningfully better than another.

Rules:
- Only return patterns where the difference is at least 1.5x (treatment_mean >= 1.5 * control_mean).
- Only return patterns with at least 3 posts on each side (sample size >= 3 for both groups).
- Pattern keys must be short kebab-case slugs (e.g. "opener-numbers-vs-questions", "single-vs-thread", "media-attached-vs-none").
- Hypotheses must be specific and prescriptive — something the generator can act on. NOT "engaging posts perform better." YES "posts that open with a specific number outperform posts that open with a question by 2.3x."
- If you can't find at least 2 patterns that meet the bar, return fewer (or none). Do not invent patterns.
- Confidence is a number 0-1. Use sample size + lift to set it: small samples or weak lift → lower confidence.

For each pattern, assign every post in the sample to exactly one of:
  - "control" (does NOT exhibit the pattern)
  - "treatment" (DOES exhibit the pattern)
  - "neither" (doesn't fit either side — exclude from this pattern's stats)

Respond with ONLY valid JSON, no markdown fences:
{
  "learnings": [
    {
      "patternKey": "kebab-case-slug",
      "hypothesis": "Specific, prescriptive finding the generator can act on.",
      "evidence": {
        "controlPostIds": ["post-id-1", "post-id-2"],
        "treatmentPostIds": ["post-id-3", "post-id-4"],
        "metric": "raw_engagement"
      },
      "confidence": 0.65
    }
  ]
}`;

interface PostRow {
  id: string;
  text: string;
  engagement: number;
  posted_at: string;
}

interface ClaudeLearning {
  patternKey: string;
  hypothesis: string;
  evidence: {
    controlPostIds: string[];
    treatmentPostIds: string[];
    metric: string;
  };
  confidence: number;
}

export interface AnalyzerOptions {
  projectId: string;
  channel: LearningChannel;
  windowDays?: number; // default 14
  minPosts?: number; // default 6 — skip if not enough data
  persist?: boolean; // default true — write to post_learnings
}

export async function runAnalyzer(opts: AnalyzerOptions): Promise<AnalyzerResult> {
  const {
    projectId,
    channel,
    windowDays = 14,
    minPosts = 6,
    persist = true,
  } = opts;

  const db = createServiceClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);
  const sinceIso = since.toISOString();
  const nowIso = new Date().toISOString();

  // Pull posts joined with their assets (for text) and latest metrics.
  // scheduled_posts has no `content` column — post text lives on the linked
  // asset (`assets.content.scheduled_text` or `.raw`).
  const { data: posts, error } = await db
    .from("scheduled_posts")
    .select(
      "id, posted_at, external_post_id, assets(content), post_metrics(likes, shares, comments, impressions)"
    )
    .eq("project_id", projectId)
    .eq("channel", channel)
    .eq("status", "posted")
    .gte("posted_at", sinceIso)
    .not("external_post_id", "is", null)
    .order("posted_at", { ascending: true });

  if (error) {
    throw new Error(`scheduled_posts query failed: ${error.message}`);
  }

  const rows: PostRow[] = (posts ?? [])
    .map((p) => {
      const metrics = Array.isArray(p.post_metrics) ? p.post_metrics[0] : p.post_metrics;
      const m = metrics as
        | { likes?: number; shares?: number; comments?: number; impressions?: number }
        | null;
      if (!m) return null;
      const engagement = (m.likes ?? 0) + (m.shares ?? 0) + (m.comments ?? 0);

      const asset = Array.isArray(p.assets) ? p.assets[0] : p.assets;
      const content = (asset as { content?: Record<string, unknown> } | null)?.content;
      const text =
        (content?.scheduled_text as string | undefined) ??
        (content?.raw as string | undefined) ??
        "";

      return {
        id: p.id,
        text,
        engagement,
        posted_at: p.posted_at as string,
      };
    })
    .filter((r): r is PostRow => r !== null && r.text.length > 0);

  const baseResult: AnalyzerResult = {
    learnings: [],
    postsConsidered: rows.length,
    rangeStart: sinceIso,
    rangeEnd: nowIso,
    modelInputTokens: 0,
    modelOutputTokens: 0,
  };

  if (rows.length < minPosts) {
    return baseResult;
  }

  const userPrompt =
    `Channel: ${channel}\nWindow: last ${windowDays} days (${rows.length} posts)\n\n` +
    rows
      .map(
        (r, i) =>
          `Post ${i + 1} [id=${r.id}] (engagement=${r.engagement})\n${truncate(r.text, 500)}`
      )
      .join("\n\n---\n\n");

  const ai = await generateWithClaude({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    model: "claude-sonnet-4-6",
    maxTokens: 2000,
    temperature: 0.3,
  });

  baseResult.modelInputTokens = ai.inputTokens;
  baseResult.modelOutputTokens = ai.outputTokens;

  const parsed = safeParse(ai.content);
  if (!parsed?.learnings?.length) {
    return baseResult;
  }

  const learnings: Learning[] = [];
  for (const raw of parsed.learnings as ClaudeLearning[]) {
    const controlIds = raw.evidence?.controlPostIds ?? [];
    const treatmentIds = raw.evidence?.treatmentPostIds ?? [];
    if (controlIds.length < 3 || treatmentIds.length < 3) continue;

    const controlEngagements = rows
      .filter((r) => controlIds.includes(r.id))
      .map((r) => r.engagement);
    const treatmentEngagements = rows
      .filter((r) => treatmentIds.includes(r.id))
      .map((r) => r.engagement);

    if (controlEngagements.length < 3 || treatmentEngagements.length < 3) continue;

    const controlMean = mean(controlEngagements);
    const treatmentMean = mean(treatmentEngagements);

    // Both groups must have non-zero engagement before we publish a
    // multiplicative lift. Otherwise treatment/control is either undefined
    // (control = 0) or non-meaningful (treatment = 0). The previous
    // implementation reported treatmentMean as the "lift" when control was 0
    // — mathematically wrong and misleading on the dashboard.
    //
    // Trade-off: patterns get held back until both arms have accumulated some
    // engagement. The right answer for v1 — better to publish nothing than to
    // publish "5.67x" when the truth is "control posts got literally zero".
    if (controlMean <= 0 || treatmentMean <= 0) continue;

    const lift = treatmentMean / controlMean;

    if (lift < 1.5) continue;

    learnings.push({
      patternKey: raw.patternKey,
      hypothesis: raw.hypothesis,
      evidence: {
        sampleSize: controlIds.length + treatmentIds.length,
        controlMean: round(controlMean, 2),
        controlPostIds: controlIds,
        treatmentMean: round(treatmentMean, 2),
        treatmentPostIds: treatmentIds,
        metric: raw.evidence?.metric ?? "raw_engagement",
        lift: round(lift, 2),
      },
      confidence: clamp(raw.confidence ?? 0.5, 0, 1),
    });
  }

  baseResult.learnings = learnings;

  if (!persist || learnings.length === 0) return baseResult;

  // Supersede prior active learnings for the same (project, channel, pattern_key),
  // then insert the fresh batch.
  for (const l of learnings) {
    await db
      .from("post_learnings")
      .update({ active: false })
      .eq("project_id", projectId)
      .eq("channel", channel)
      .eq("pattern_key", l.patternKey)
      .eq("active", true);

    const { error: insertError } = await db.from("post_learnings").insert({
      project_id: projectId,
      channel,
      pattern_key: l.patternKey,
      hypothesis: l.hypothesis,
      evidence: l.evidence,
      confidence: l.confidence,
      active: true,
    });
    if (insertError) {
      console.error(
        `[analyzer] insert failed for pattern ${l.patternKey}: ${insertError.message}`
      );
    }
  }

  return baseResult;
}

function safeParse(raw: string): { learnings?: ClaudeLearning[] } | null {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/**
 * Returns active learnings for a project/channel, ranked by confidence,
 * suitable for injecting into a generator's system prompt.
 */
export async function getActiveLearnings(
  projectId: string,
  channel: LearningChannel,
  limit = 5
): Promise<Learning[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("post_learnings")
    .select("pattern_key, hypothesis, evidence, confidence")
    .eq("project_id", projectId)
    .eq("channel", channel)
    .eq("active", true)
    .order("confidence", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    patternKey: r.pattern_key as string,
    hypothesis: r.hypothesis as string,
    evidence: r.evidence as Learning["evidence"],
    confidence: Number(r.confidence),
  }));
}

/**
 * Formats active learnings into a short block ready for injection into a
 * generator system prompt. Returns an empty string if there are none.
 */
export function formatLearningsForPrompt(learnings: Learning[]): string {
  if (learnings.length === 0) return "";
  const lines = learnings.map(
    (l, i) =>
      `${i + 1}. ${l.hypothesis} (${l.evidence.lift}x lift, n=${l.evidence.sampleSize}, confidence=${l.confidence})`
  );
  return `\n\nLearnings from recent performance on this channel — apply these unless they conflict with the brief:\n${lines.join("\n")}\n`;
}
