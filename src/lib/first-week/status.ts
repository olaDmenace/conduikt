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
  result?: { output?: unknown } | null;
}

export async function loadFirstWeek(service: Db, projectId: string, includeOutput: boolean) {
  const { data: parent } = await service
    .from("scheduled_executions")
    .select("id, payload, result, created_at")
    .eq("execution_type", FIRST_WEEK)
    .eq("parent_id", projectId)
    .maybeSingle();
  if (!parent) return null;

  const columns = includeOutput
    ? "id, status, payload, ran_at, last_error, completed_at, result"
    : "id, status, payload, ran_at, last_error, completed_at";
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
  const result = (parent.result ?? {}) as { previews?: Array<{ agentId: string; headline: string; items: string[] }>; previewsReady?: boolean };
  const byAgent = new Map(children.map((c) => [c.payload.agentId, c]));

  const agents = firstWeekAgents()
    .filter((a) => payload.run.includes(a.id) || payload.locked.includes(a.id))
    .map((a) => {
      if (payload.locked.includes(a.id)) {
        const preview = result.previews?.find((p) => p.agentId === a.id) ?? null;
        return { ...a, state: "locked" as const, preview };
      }
      const row = byAgent.get(a.id);
      const state =
        row?.status === "completed" ? "done" : row?.status === "failed" ? "failed" : row?.status === "running" ? "running" : "queued";
      return {
        ...a,
        state,
        executionId: row?.id ?? null,
        output: includeOutput ? (row?.result?.output ?? null) : undefined,
      };
    });

  const ran = agents.filter((a) => a.state !== "locked");
  return {
    projectId,
    started: true,
    host: payload.host,
    plan: payload.plan,
    previewsReady: !!result.previewsReady,
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
