import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { isMetaAdsEnabled, syncAdInsights } from "@/src/lib/integrations/meta-ads";

/**
 * Every six hours, pull the last seven days of per-ad daily insights for
 * every project with a Meta Ads connection into ad_insights.
 *
 * Without the Facebook flag, or with no connections, the run returns early
 * and logs one line. One project's failure never stops the others.
 *
 * Registration (not done here, see src/lib/inngest/index.ts and
 * src/app/api/inngest/route.ts):
 *   export { syncAdInsightsJob } from "./functions/sync-ad-insights";
 */
export const syncAdInsightsJob = inngest.createFunction(
  { id: "sync-ad-insights", retries: 1 },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    if (!isMetaAdsEnabled()) {
      console.log("[sync-ad-insights] Facebook integration flag is off; nothing to do.");
      return { projects: 0, synced: 0, errors: 0, skipped: "flag_off" };
    }

    const supabase = createServiceClient();

    const projectIds = await step.run("list-connected-projects", async () => {
      const { data } = await supabase
        .from("connected_accounts")
        .select("project_id")
        .eq("platform", "meta_ads")
        .not("project_id", "is", null);
      return Array.from(
        new Set((data ?? []).map((r) => r.project_id as string).filter(Boolean))
      );
    });

    if (projectIds.length === 0) {
      return { projects: 0, synced: 0, errors: 0 };
    }

    // One step per project: a retry resumes after the last finished project
    // instead of re-pulling every account, and one project's failure never
    // stops the others.
    let synced = 0;
    let errors = 0;
    for (const projectId of projectIds) {
      const outcome = await step.run(`sync-${projectId}`, async () => {
        try {
          const r = await syncAdInsights(projectId, supabase, { days: 7 });
          if (!r.ok) console.warn(`[sync-ad-insights] ${projectId}: ${r.reason}`);
          return { synced: r.ok, failed: false };
        } catch (err) {
          console.error(`[sync-ad-insights] ${projectId} failed:`, err instanceof Error ? err.message : err);
          return { synced: false, failed: true };
        }
      });
      if (outcome.synced) synced++;
      if (outcome.failed) errors++;
    }
    const result = { synced, errors };

    console.log(
      `[sync-ad-insights] Done: projects=${projectIds.length}, synced=${result.synced}, errors=${result.errors}`
    );
    return { projects: projectIds.length, ...result };
  }
);
