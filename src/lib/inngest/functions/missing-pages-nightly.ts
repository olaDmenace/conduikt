import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { runMissingPages } from "@/src/lib/missing-pages/run";

// The 2am loop from the reel. Every project that turned on "Run every
// night" gets one run as its own step: crawl, find the searches it has no
// page for, write the best one, check it, and leave it in Drafts waiting
// for the owner's OK (or put it live if the project is Hands off and has
// somewhere to publish).
//
// Registered by the lead in src/lib/inngest/index.ts and the Inngest route.
export const missingPagesNightly = inngest.createFunction(
  { id: "missing-pages-nightly", retries: 1, concurrency: { limit: 2 } },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();

    const projects = await step.run("fetch-enabled-projects", async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("missing_pages_enabled", true).order("created_at");
      return (data ?? []) as Array<{ id: string; name: string }>;
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

    return { projects: projects.length, outcomes };
  }
);
