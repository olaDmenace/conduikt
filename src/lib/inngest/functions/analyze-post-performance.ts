import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { runAnalyzer } from "@/src/lib/loop-closure/analyzer";
import type { LearningChannel } from "@/src/lib/loop-closure/types";

/**
 * Daily scheduled function: for each (project, channel) with at least 6
 * posted-and-synced posts in the last 14 days, re-runs the analyzer and
 * upserts fresh learnings into post_learnings.
 *
 * Runs once per day at 03:00 UTC — well after the 6-hour sync-social-metrics
 * cron, so the analyzer always sees a fresh metrics snapshot.
 */
export const analyzePostPerformance = inngest.createFunction(
  { id: "analyze-post-performance", retries: 1 },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();

    // Find (project, channel) pairs with enough recent activity to analyze.
    const pairs = await step.run("find-active-pairs", async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data } = await supabase
        .from("scheduled_posts")
        .select("project_id, channel")
        .in("channel", ["x", "linkedin"])
        .eq("status", "posted")
        .gte("posted_at", fourteenDaysAgo.toISOString())
        .limit(2000);

      if (!data) return [];

      const counts = new Map<string, number>();
      for (const r of data) {
        const key = `${r.project_id}::${r.channel}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return [...counts.entries()]
        .filter(([, n]) => n >= 6)
        .map(([key, count]) => {
          const [projectId, channel] = key.split("::");
          return { projectId, channel: channel as LearningChannel, count };
        });
    });

    if (pairs.length === 0) {
      return { analyzed: 0, errors: 0, learnings_total: 0 };
    }

    let analyzed = 0;
    let errors = 0;
    let learningsTotal = 0;

    for (const pair of pairs) {
      try {
        const result = await step.run(`analyze-${pair.projectId}-${pair.channel}`, () =>
          runAnalyzer({
            projectId: pair.projectId,
            channel: pair.channel,
            windowDays: 14,
            minPosts: 6,
            persist: true,
          })
        );
        analyzed++;
        learningsTotal += result.learnings.length;
      } catch (err) {
        errors++;
        console.error(
          `[analyze-post-performance] ${pair.projectId}/${pair.channel} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(
      `[analyze-post-performance] Done: pairs=${pairs.length} analyzed=${analyzed} errors=${errors} learnings=${learningsTotal}`
    );

    return { analyzed, errors, learnings_total: learningsTotal };
  }
);
