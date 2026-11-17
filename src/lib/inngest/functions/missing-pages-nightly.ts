import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { runMissingPages } from "@/src/lib/missing-pages/run";
import { factsFromProject, hasSomethingToCheck, type ProjectRow } from "@/src/lib/missing-pages/facts";

// The 2am loop from the reel. Every project that turned on "Run every
// night" gets one run as its own step: crawl, find the searches it has no
// page for, write the best one, check it, and leave it in Drafts waiting
// for the owner's OK (or put it live if the project is Hands off and has
// somewhere to publish).
//
// A project with no website and no services is skipped before its step
// runs, so nothing is crawled, nothing is counted as a run and no error is
// recorded against it; the owner sees the hint on the Missing Pages screen.
//
// A site that could not be read that night (a bot challenge, a timeout)
// comes back from runMissingPages with error "site_unreachable" and no
// candidates touched; the outcome records it and the loop moves on.
//
// Registered by the lead in src/lib/inngest/index.ts and the Inngest route.
export const missingPagesNightly = inngest.createFunction(
  { id: "missing-pages-nightly", retries: 1, concurrency: { limit: 2 } },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();

    const { projects, skipped } = await step.run("fetch-enabled-projects", async () => {
      const { data } = await supabase.from("projects").select("id, name, website_url, services").eq("missing_pages_enabled", true).order("created_at");
      const rows = (data ?? []) as Array<Pick<ProjectRow, "id" | "name" | "website_url" | "services">>;
      const ready: Array<{ id: string; name: string }> = [];
      const skipped: string[] = [];
      for (const row of rows) {
        if (hasSomethingToCheck(factsFromProject({ ...row, name: row.name }))) ready.push({ id: row.id, name: row.name });
        else skipped.push(row.id);
      }
      return { projects: ready, skipped };
    });

    const outcomes: Array<{ projectId: string; written: number; published: number; error: string | null }> = [];

    for (const project of projects) {
      const outcome = await step.run(`run-${project.id}`, async () => {
        try {
          const result = await runMissingPages({ projectId: project.id, supabase, mode: "nightly", maxPages: 1 });
          return { projectId: project.id, written: result.pagesWritten, published: result.pagesPublished, error: result.error ? `${result.error.code}: ${result.error.message}` : null };
        } catch (err) {
          // One project's failure never stops the others.
          return { projectId: project.id, written: 0, published: 0, error: err instanceof Error ? err.message : "failed" };
        }
      });
      outcomes.push(outcome);
    }

    return { projects: projects.length, skipped, outcomes };
  }
);
