import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { generateWithClaude } from "@/src/lib/ai/client";

/**
 * Weekly Inngest function that analyses all tracked competitors.
 * Runs every Monday at 3am UTC.
 */
export const syncCompetitors = inngest.createFunction(
  { id: "sync-competitors", retries: 1 },
  { cron: "0 3 * * 1" }, // Weekly, Monday 3am UTC
  async ({ step }) => {
    const supabase = createServiceClient();

    // Fetch all trackers with their project info
    const trackers = await step.run("fetch-trackers", async () => {
      const { data } = await supabase
        .from("competitor_trackers")
        .select("*, projects(id, name, user_id)")
        .order("created_at");

      return data ?? [];
    });

    if (trackers.length === 0) {
      return { analysed: 0 };
    }

    let analysed = 0;

    for (const tracker of trackers) {
      await step.run(`analyse-${tracker.id}`, async () => {
        try {
          const result = await generateWithClaude({
            systemPrompt: `You are an SEO and competitor analysis expert. Analyse the competitor website and return a structured JSON assessment.

Return ONLY valid JSON:
{
  "keyword_overlap": number (0-100 estimate),
  "estimated_da": number (0-100 domain authority estimate),
  "top_keywords": ["keyword1", "keyword2", ...up to 10],
  "content_gaps": ["topic gap 1", "topic gap 2", ...up to 5],
  "summary": "2-3 sentence analysis"
}`,
            userPrompt: `Analyse this competitor: ${tracker.competitor_url}
Competitor name: ${tracker.competitor_name || "Unknown"}
Our project: ${(tracker.projects as { name: string } | null)?.name ?? "Unknown"}`,
            maxTokens: 1000,
          });

          const cleaned = result.content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);

          // Save snapshot
          await supabase.from("competitor_snapshots").insert({
            tracker_id: tracker.id,
            keyword_overlap: parsed.keyword_overlap ?? null,
            content_gaps: parsed.content_gaps ?? [],
            estimated_da: parsed.estimated_da ?? null,
            top_keywords: parsed.top_keywords ?? [],
            snapshot_data: parsed,
          });

          // Update last_checked_at
          await supabase
            .from("competitor_trackers")
            .update({ last_checked_at: new Date().toISOString() })
            .eq("id", tracker.id);

          // Log to ai_generations
          const projectId = (tracker.projects as { id: string } | null)?.id;
          if (projectId) {
            await supabase.from("ai_generations").insert({
              project_id: projectId,
              agent_used: "competitor-analysis",
              input_tokens: result.inputTokens,
              output_tokens: result.outputTokens,
              model: result.model,
              duration_ms: result.durationMs,
            });
          }

          analysed++;
        } catch (err) {
          console.error(
            `[sync-competitors] Failed to analyse ${tracker.competitor_url}:`,
            err
          );
          // Continue with next tracker
        }
      });
    }

    return { analysed, total: trackers.length };
  }
);
