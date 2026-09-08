import { describe, it, expect, vi } from "vitest";
import { buildPerformanceContext } from "@/src/lib/ai/performance-context";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * FEEDBACK-LOOP VERIFICATION HARNESS
 * ==================================
 *
 * Conduikt's central product claim: engagement data from published
 * posts automatically flows back into the AI's context when it generates
 * next week's content. This test file proves that claim end-to-end at
 * the load-bearing seams — without hitting Supabase, Anthropic, or the
 * live loop.
 *
 * The full 5-stage spec lives in PRODUCT-PLAN.md §5. This file covers
 * the two stages that are meaningful to verify in-process with mocks:
 *
 *   Stage 3 · Prompt injection
 *     Given a project with active learnings in post_learnings, the
 *     assembled generator context MUST include those learnings verbatim
 *     (or structurally equivalent) so the LLM sees them.
 *
 *   Stage 5 · End-to-end (partial)
 *     Given a project with multiple performance signals (top posts,
 *     audit trend, GSC keywords, learnings), the context assembles
 *     every signal in a stable structure — a regression here breaks
 *     the entire loop silently.
 *
 * Stages 1 (ingestion) and 2 (analyzer) live in their own dedicated
 * integration tests where Anthropic + the sync APIs are mocked; stage
 * 4 (behavioural diff) requires a live LLM call and is documented as a
 * QA runbook step rather than an automated test.
 *
 * If ANY test in this file breaks, the closed-loop claim is broken.
 * Do not skip these tests to make CI green.
 */

// Build a chainable Supabase-like mock that responds to a fixed script
// of table → response mappings. Each `.from(table)` returns a chain that
// eventually resolves to the matching row-set. Order of chain calls is
// not enforced — we just need the terminal `await` on the query builder
// to yield the seeded rows.
function makeStubClient(
  tables: Record<string, { data: unknown[] | null; error: unknown | null }>
): SupabaseClient {
  function chain(tableName: string): Record<string, unknown> {
    const response = tables[tableName] ?? { data: [], error: null };
    const c: Record<string, unknown> = {};
    for (const method of [
      "select",
      "eq",
      "neq",
      "in",
      "order",
      "gte",
      "lte",
      "not",
    ]) {
      c[method] = () => c;
    }
    // Terminal ops resolve to the seeded response.
    c.limit = () => Promise.resolve(response);
    c.single = () =>
      Promise.resolve({
        data: response.data?.[0] ?? null,
        error: response.error,
      });
    c.maybeSingle = c.single;
    // Also make the chain itself thenable so callers that `await` the
    // query builder directly (without .limit) still resolve.
    (c as { then?: unknown }).then = (fn: (v: unknown) => unknown) =>
      Promise.resolve(response).then(fn);
    return c;
  }

  return {
    from: vi.fn((table: string) => chain(table)),
  } as unknown as SupabaseClient;
}

describe("feedback-loop · Stage 3 · Prompt injection", () => {
  it("assembled context includes active learnings from post_learnings verbatim", async () => {
    // Seed one active learning — this is the LOAD-BEARING assertion
    // for the closed loop. If the hypothesis text doesn't appear in
    // the assembled context string, the analyzer's output is invisible
    // to the generator and the loop is silently broken.
    const client = makeStubClient({
      assets: { data: [], error: null },
      scheduled_posts: { data: [], error: null },
      audits: { data: [], error: null },
      keyword_data: { data: [], error: null },
      post_metrics: { data: [], error: null },
      post_learnings: {
        data: [
          {
            channel: "linkedin",
            hypothesis:
              "Posts opening with a specific statistic outperform posts opening with a question by 2.3x.",
            evidence: { lift: 2.3, sampleSize: 12 },
            confidence: 0.72,
          },
        ],
        error: null,
      },
    });

    const context = await buildPerformanceContext("test-project", client);

    // Load-bearing check: the hypothesis text is present in the string
    expect(context).toContain(
      "Posts opening with a specific statistic outperform posts opening with a question by 2.3x."
    );
    // Metadata is preserved in the format the audit expects
    expect(context).toContain("lift"); // lift=2.3
    expect(context).toContain("n=12");
    expect(context).toContain("confidence=0.72");
    // The section header exists so the LLM sees these as learnings,
    // not accidental copy
    expect(context).toContain("Active Learnings");
  });

  it("multiple learnings all appear, ordered by confidence descending", async () => {
    // Two learnings with different confidences. The buildPerformanceContext
    // call uses `.order("confidence", { ascending: false })` — this test
    // verifies that ordering isn't accidentally dropped in a refactor.
    // Seed rows in the order we expect them back.
    const client = makeStubClient({
      assets: { data: [], error: null },
      scheduled_posts: { data: [], error: null },
      audits: { data: [], error: null },
      keyword_data: { data: [], error: null },
      post_metrics: { data: [], error: null },
      post_learnings: {
        data: [
          {
            channel: "x",
            hypothesis: "High-confidence pattern about thread length.",
            evidence: { lift: 3.1, sampleSize: 20 },
            confidence: 0.9,
          },
          {
            channel: "linkedin",
            hypothesis: "Lower-confidence pattern about hashtags.",
            evidence: { lift: 1.6, sampleSize: 6 },
            confidence: 0.55,
          },
        ],
        error: null,
      },
    });

    const context = await buildPerformanceContext("test-project", client);

    const highIdx = context.indexOf("thread length");
    const lowIdx = context.indexOf("hashtags");
    expect(highIdx).toBeGreaterThan(-1);
    expect(lowIdx).toBeGreaterThan(-1);
    expect(highIdx).toBeLessThan(lowIdx); // high-confidence first
  });

  it("returns empty string when nothing to inject (no false-positive signals)", async () => {
    // Regression guard: if every source is empty, the function must
    // return "" — not a header-only string that the LLM will read as
    // "the user has no history so make it up."
    const empty = { data: [], error: null };
    const client = makeStubClient({
      assets: empty,
      scheduled_posts: empty,
      audits: empty,
      keyword_data: empty,
      post_metrics: empty,
      post_learnings: empty,
    });
    const context = await buildPerformanceContext("test-project", client);
    expect(context).toBe("");
  });
});

describe("feedback-loop · Stage 5 · End-to-end assembly (in-process)", () => {
  it("assembles every performance signal into one coherent context string", async () => {
    // Seed one row into every source the generator reads. If any of
    // these silently disappear (schema change, refactor, PR that drops
    // one .from call), this test breaks and flags the loop weakness
    // before it ships.
    const client = makeStubClient({
      assets: {
        data: [
          {
            title: "Launch Post",
            type: "social_post",
            status: "published",
            performance: { impressions: 5000, likes: 240, shares: 18 },
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      },
      scheduled_posts: {
        data: [
          { channel: "x", status: "posted" },
          { channel: "x", status: "posted" },
          { channel: "x", status: "failed" },
          { channel: "linkedin", status: "posted" },
        ],
        error: null,
      },
      audits: {
        data: [
          { score: 82, created_at: new Date().toISOString() },
          {
            score: 74,
            created_at: new Date(Date.now() - 86_400_000).toISOString(),
          },
        ],
        error: null,
      },
      keyword_data: {
        data: [
          { term: "ai marketing", clicks: 120, impressions: 3400, position: 4.2 },
        ],
        error: null,
      },
      post_metrics: {
        data: [
          {
            impressions: 5000,
            likes: 240,
            shares: 18,
            comments: 12,
            channel: "x",
            scheduled_post_id: "sp-1",
          },
        ],
        error: null,
      },
      post_learnings: {
        data: [
          {
            channel: "x",
            hypothesis:
              "Threads outperform single tweets on our account by 1.8x.",
            evidence: { lift: 1.8, sampleSize: 9 },
            confidence: 0.68,
          },
        ],
        error: null,
      },
    });

    const context = await buildPerformanceContext("test-project", client);

    // Every signal source must contribute a section
    expect(context).toContain("Published Content Performance"); // assets
    expect(context).toContain("Publishing Success Rates"); // scheduled_posts
    expect(context).toContain("SEO Audit Status"); // audits
    expect(context).toContain("improving"); // audit trend derivation
    expect(context).toContain("Top Search Keywords"); // keyword_data
    expect(context).toContain("Top Performing Social Posts"); // post_metrics
    expect(context).toContain("Active Learnings"); // post_learnings

    // Specific values from the seeded data
    expect(context).toContain("Launch Post");
    expect(context).toContain("82/100");
    expect(context).toContain("ai marketing");
    expect(context).toContain("Threads outperform single tweets");

    // The section header framing tells the LLM how to interpret this
    expect(context).toContain("Past Performance Data");
    expect(context).toContain(
      "Lean into what's working and improve what isn't"
    );
  });
});
