import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWithClaudeCompletion, TruncatedResponseError } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";
import type { HandlerResult } from "@/src/lib/scheduler/types";

// Runs one agent of a "first week" pack. Shared by the request that starts
// the pack (via after()) and the scheduler handler, which picks up any row
// the request did not get to. Rows live in scheduled_executions:
//   parent  execution_type "first_week",       parent_id = project id
//   child   execution_type "first_week_agent", parent_id = parent row id
// The child's result holds the agent's parsed output.

export const FIRST_WEEK = "first_week";
export const FIRST_WEEK_AGENT = "first_week_agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export async function runFirstWeekAgent(supabase: Db, payload: Record<string, unknown>): Promise<HandlerResult> {
  const projectId = typeof payload.projectId === "string" ? payload.projectId : null;
  const agentId = typeof payload.agentId === "string" ? payload.agentId : null;
  const input = (payload.input ?? {}) as Record<string, unknown>;
  const agent = agentId ? getAgent(agentId) : undefined;
  if (!projectId || !agent) return { ok: false, error: "Bad first-week payload", retryable: false };

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return { ok: false, error: "Project no longer exists", retryable: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_primary_color")
    .eq("id", project.user_id)
    .maybeSingle();

  const context = buildProjectContext(project, profile);
  let result;
  try {
    result = await generateWithClaudeCompletion({
      systemPrompt: agent.buildSystemPrompt(context),
      userPrompt: agent.buildUserPrompt(input),
      model: agent.model,
      maxTokens: agent.maxTokens,
    });
  } catch (err) {
    if (err instanceof TruncatedResponseError) return { ok: false, error: "The answer was cut short", retryable: true };
    return { ok: false, error: err instanceof Error ? err.message : "Model call failed", retryable: true };
  }

  let parsed;
  try {
    parsed = agent.parseResponse(result.content);
  } catch {
    return { ok: false, error: "Couldn't read the agent's answer", retryable: true };
  }

  await supabase.from("ai_generations").insert({
    project_id: projectId,
    agent_used: agent.id,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    model: result.model,
    duration_ms: result.durationMs,
  });

  return {
    ok: true,
    result: {
      type: parsed.type,
      output: parsed.data as Record<string, unknown>,
      usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    },
  };
}

/**
 * Claim and run the given pending rows, a few at a time. Each claim is the
 * same atomic pending→running update the scheduler uses, so the cron tick
 * and this loop never run the same row twice.
 */
export async function runFirstWeekRows(supabase: Db, ids: string[], concurrency = 5): Promise<void> {
  const queue = [...ids];
  async function worker() {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const { data: row } = await supabase
        .from("scheduled_executions")
        .update({ status: "running", ran_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "pending")
        .select("id, payload, attempts, max_attempts")
        .maybeSingle();
      if (!row) continue;
      const attempts = (row.attempts ?? 0) + 1;
      const out = await runFirstWeekAgent(supabase, row.payload ?? {}).catch(
        (err): HandlerResult => ({ ok: false, error: err instanceof Error ? err.message : "failed", retryable: true })
      );
      if (out.ok) {
        await supabase
          .from("scheduled_executions")
          .update({ status: "completed", attempts, result: out.result ?? null, last_error: null, completed_at: new Date().toISOString() })
          .eq("id", id);
      } else {
        const retry = out.retryable !== false && attempts < (row.max_attempts ?? 2);
        await supabase
          .from("scheduled_executions")
          .update(
            retry
              ? { status: "pending", attempts, last_error: out.error }
              : { status: "failed", attempts, last_error: out.error, completed_at: new Date().toISOString() }
          )
          .eq("id", id);
        // One immediate retry in-process; anything still pending is left to the cron.
        if (retry && attempts < 2) queue.push(id);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
}
