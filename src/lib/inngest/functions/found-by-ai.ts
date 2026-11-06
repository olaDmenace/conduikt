import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { availableEngines, checkVisibility } from "@/src/lib/integrations/ai-visibility";

/**
 * Nightly at 03:00 UTC: ask the answer engines each eligible project's
 * money questions and record who was named (audit §5.9 item 4).
 *
 * Eligible = projects with Missing Pages switched on, or with a Meta Ads
 * or WhatsApp connection (a cheap "this owner is investing in being
 * found" signal). Capped at DAILY_QUESTION_CAP questions per project per
 * day inside checkVisibility.
 *
 * With no engine key the run exits after one log line.
 *
 * Registration (not done here):
 *   src/lib/inngest/index.ts:      export { foundByAi } from "./functions/found-by-ai";
 *   src/app/api/inngest/route.ts:  add foundByAi to the functions array
 */
export const foundByAi = inngest.createFunction(
  { id: "found-by-ai", retries: 1 },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    if (availableEngines().length === 0) {
      console.log("[found-by-ai] No answer engine key set (PERPLEXITY_API_KEY); nothing to do.");
      return { projects: 0, asked: 0, skipped: "no_engine" };
    }

    const supabase = createServiceClient();

    const projectIds = await step.run("list-eligible-projects", async () => {
      const ids = new Set<string>();

      const { data: conns } = await supabase
        .from("connected_accounts")
        .select("project_id")
        .in("platform", ["meta_ads", "whatsapp"])
        .not("project_id", "is", null);
      for (const c of conns ?? []) if (c.project_id) ids.add(c.project_id as string);

      // The Missing Pages flag lands with another workstream; if the column
      // is not there yet this query errors and we simply skip it.
      try {
        const { data: flagged, error } = await supabase
          .from("projects")
          .select("id")
          .eq("missing_pages_enabled", true);
        if (!error) for (const p of flagged ?? []) ids.add(p.id as string);
      } catch {
        // column absent; ignore
      }

      return Array.from(ids);
    });

    if (projectIds.length === 0) {
      return { projects: 0, asked: 0 };
    }

    const result = await step.run("check-each-project", async () => {
      let asked = 0;
      let errors = 0;
      for (const projectId of projectIds) {
        try {
          const r = await checkVisibility(projectId, { db: supabase });
          asked += r.asked;
          if (!r.ok) console.warn(`[found-by-ai] ${projectId}: ${r.reason}`);
        } catch (err) {
          errors++;
          console.error(`[found-by-ai] ${projectId} failed:`, err instanceof Error ? err.message : err);
        }
      }
      return { asked, errors };
    });

    console.log(
      `[found-by-ai] Done: projects=${projectIds.length}, asked=${result.asked}, errors=${result.errors}`
    );
    return { projects: projectIds.length, ...result };
  }
);
