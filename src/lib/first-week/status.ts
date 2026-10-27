import type { SupabaseClient } from "@supabase/supabase-js";
import { firstWeekAgents } from "./plan";
import { FIRST_WEEK, FIRST_WEEK_AGENT } from "./run";

// Progress of a project's first-week pack, shared by the status API and
// the PDF report. Uses a service client: callers check ownership first.

const STALE_MS = 6 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

interface ChildRow {
  id: string;
  status: string;
  payload: { agentId: string };
  ran_at: string | null;
  last_error: string | null;
  completed_at: string | null;
  /** Finished rows hold the agent's output; failed rows hold `{ errorCode, reason }` (see run.ts). */
  result?: { output?: unknown; errorCode?: string | null } | null;
  /** The failure code alone, selected out of `result` when outputs are left out. */
  error_code?: string | null;
}

/** A preview as stored on the parent row: real, or a sample standing in for one. */
interface StoredPreview {
  agentId: string;
  headline: string;
  items: string[];
  sample?: boolean;
}

export async function loadFirstWeek(service: Db, projectId: string, includeOutput: boolean) {
  const { data: parent } = await service
    .from("scheduled_executions")
    .select("id, payload, result, created_at")
    .eq("execution_type", FIRST_WEEK)
    .eq("parent_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!parent) return null;

  // Polls leave the outputs out but still need the failure code, so it is
  // picked out of the result JSON (PostgREST `alias:column->>key`).
  const columns = includeOutput
    ? "id, status, payload, ran_at, last_error, completed_at, result"
    : "id, status, payload, ran_at, last_error, completed_at, error_code:result->>errorCode";
  const { data: childRows } = await service
    .from("scheduled_executions")
    .select(columns)
    .eq("parent_id", parent.id)
    .eq("execution_type", FIRST_WEEK_AGENT);
  const children = (childRows ?? []) as unknown as ChildRow[];

  // A row stuck in "running" means the request that ran it died; hand it
  // back to the scheduler.
  const now = Date.now();
  const stale = children.filter((c) => c.status === "running" && c.ran_at && now - Date.parse(c.ran_at) > STALE_MS);
  if (stale.length) {
    await service.from("scheduled_executions").update({ status: "pending" }).in("id", stale.map((c) => c.id)).eq("status", "running");
    for (const c of stale) c.status = "pending";
  }

  const payload = parent.payload as { plan: string; run: string[]; locked: string[]; host: string };
  const result = (parent.result ?? {}) as { previews?: StoredPreview[]; previewsReady?: boolean };
  const byAgent = new Map(children.map((c) => [c.payload.agentId, c]));

  // Show agents in the order the run was planned (the playbook's order),
  // not registry order.
  const planned = [...payload.run, ...payload.locked];
  const agents = firstWeekAgents()
    .filter((a) => planned.includes(a.id))
    .sort((a, b) => planned.indexOf(a.id) - planned.indexOf(b.id))
    .map((a) => {
      if (payload.locked.includes(a.id)) {
        const stored = result.previews?.find((p) => p.agentId === a.id) ?? null;
        const preview = stored ? { headline: stored.headline, items: stored.items, sample: stored.sample === true } : null;
        return { ...a, state: "locked" as const, preview };
      }
      const row = byAgent.get(a.id);
      const state =
        row?.status === "completed" ? "done" : row?.status === "failed" ? "failed" : row?.status === "running" ? "running" : "queued";
      const errorCode = state === "failed" ? (row?.error_code ?? row?.result?.errorCode ?? null) : null;
      return {
        ...a,
        state,
        executionId: row?.id ?? null,
        errorCode,
        output: includeOutput ? (row?.result?.output ?? null) : undefined,
      };
    });

  const ran = agents.filter((a) => a.state !== "locked");
  return {
    projectId,
    started: true,
    startedAt: parent.created_at as string,
    host: payload.host,
    plan: payload.plan,
    previewsReady: !!result.previewsReady,
    /** True when the previews are generic samples, not results for this site. */
    previewsSample: (result.previews ?? []).some((p) => p.sample === true),
    done: ran.every((a) => a.state === "done" || a.state === "failed"),
    counts: {
      done: ran.filter((a) => a.state === "done").length,
      running: ran.filter((a) => a.state === "running").length,
      queued: ran.filter((a) => a.state === "queued").length,
      failed: ran.filter((a) => a.state === "failed").length,
      locked: agents.length - ran.length,
    },
    agents,
  };
}
