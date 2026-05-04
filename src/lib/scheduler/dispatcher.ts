import type { SupabaseClient } from "@supabase/supabase-js";
import { getHandler } from "./registry";
import type { ScheduledExecution } from "./types";

// One dispatch tick: pull due rows, claim each via an atomic update, run
// the handler, write result. Returns counts so the cron endpoint can
// surface them in logs/responses.
//
// Concurrency model: each tick claims one row at a time with
// "UPDATE ... SET status='running' WHERE id=? AND status='pending'".
// Two ticks racing on the same row will see one win (rowcount=1) and one
// lose (rowcount=0); the loser moves on. This avoids needing SELECT FOR
// UPDATE / advisory locks at the cost of doing N round-trips per tick.
// Acceptable for the volumes we expect.

export interface DispatchResult {
  scanned: number;
  completed: number;
  failed: number;
  retried: number;
  unhandled: number; // unknown execution_type — left pending until a handler is registered
}

interface DispatchOptions {
  // Soft cap so a single tick doesn't churn forever if there's a backlog.
  // Defaults to 50.
  limit?: number;
  // Override "now" for tests.
  now?: Date;
}

// Exponential backoff: 1m, 5m, 15m for attempts 1, 2, 3.
function backoffSeconds(attempts: number): number {
  if (attempts <= 1) return 60;
  if (attempts === 2) return 300;
  return 900;
}

export async function dispatchDueExecutions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const limit = options.limit ?? 50;
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const result: DispatchResult = {
    scanned: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    unhandled: 0,
  };

  const { data: due, error } = await supabase
    .from("scheduled_executions")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`scheduler tick query failed: ${error.message}`);
  }
  if (!due || due.length === 0) return result;

  for (const row of due as ScheduledExecution[]) {
    result.scanned += 1;

    // Atomic claim: only succeeds if the row is still pending.
    const { data: claimed, error: claimErr } = await supabase
      .from("scheduled_executions")
      .update({
        status: "running",
        attempts: row.attempts + 1,
        ran_at: nowIso,
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimErr || !claimed) {
      // Another tick won the race — skip silently.
      continue;
    }

    const claimedRow = claimed as ScheduledExecution;
    const handler = getHandler(claimedRow.execution_type);

    if (!handler) {
      // No handler yet — return to pending so we don't burn an attempt.
      // (The bump to attempts above gets reverted via attempts: row.attempts.)
      result.unhandled += 1;
      await supabase
        .from("scheduled_executions")
        .update({
          status: "pending",
          attempts: row.attempts,
          last_error: `No handler registered for "${claimedRow.execution_type}"`,
        })
        .eq("id", claimedRow.id);
      continue;
    }

    let handlerOutput;
    try {
      handlerOutput = await handler(claimedRow.payload, {
        execution: claimedRow,
        supabase,
      });
    } catch (err) {
      handlerOutput = {
        ok: false as const,
        error: err instanceof Error ? err.message : "handler threw",
        retryable: true,
      };
    }

    if (handlerOutput.ok) {
      await supabase
        .from("scheduled_executions")
        .update({
          status: "completed",
          result: handlerOutput.result ?? null,
          last_error: null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", claimedRow.id);
      result.completed += 1;
      continue;
    }

    // Failure path — retry if attempts left and the handler hasn't told us
    // it's a hard failure.
    const exhausted = claimedRow.attempts >= claimedRow.max_attempts;
    const retryable = handlerOutput.retryable !== false && !exhausted;

    if (retryable) {
      const next = new Date(now.getTime() + backoffSeconds(claimedRow.attempts) * 1000);
      await supabase
        .from("scheduled_executions")
        .update({
          status: "pending",
          last_error: handlerOutput.error,
          scheduled_for: next.toISOString(),
        })
        .eq("id", claimedRow.id);
      result.retried += 1;
    } else {
      await supabase
        .from("scheduled_executions")
        .update({
          status: "failed",
          last_error: handlerOutput.error,
          completed_at: new Date().toISOString(),
        })
        .eq("id", claimedRow.id);
      result.failed += 1;
    }
  }

  return result;
}
