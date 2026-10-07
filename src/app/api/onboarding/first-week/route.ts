import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { normalizePlan } from "@/src/lib/plans";
import { normalizeAuditUrl } from "@/src/lib/onboarding/url";
import { fetchPageSignal } from "@/src/lib/onboarding/magic-audit";
import { assertPublicUrl, BlockedUrlError, safeFetch } from "@/src/lib/security/safe-fetch";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { firstWeekAgents, firstWeekInput, splitByPlan, type SiteBrief } from "@/src/lib/first-week/plan";
import { generateAgentPreviews } from "@/src/lib/first-week/previews";
import { FIRST_WEEK, FIRST_WEEK_AGENT, runFirstWeekRows } from "@/src/lib/first-week/run";

// "Your first week": run every agent the user's plan includes against
// their website, and preview the rest.
//
//   POST { url, audit? }  → finds or creates the project for that site,
//                           queues one row per agent, returns at once;
//                           the agents run after the response.
//   GET  ?projectId=…     → progress for the Overview / results page.
//        &include=output  → also the finished outputs.
//
// Runs once per project (idempotency keys). These runs don't count toward
// the monthly content allowance: they're the product showing what it does.

export const maxDuration = 300;

const STALE_MS = 6 * 60 * 1000;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const hostOf = (u: string) => new URL(u).hostname.replace(/^www\./, "");

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`first-week:${user.id}`, { limit: 5, windowSeconds: 3600 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    audit?: { seoScore?: number; brandVoice?: { tone?: string; audience?: string; valueProposition?: string } };
  };
  const url = normalizeAuditUrl(body.url ?? "");
  if (!url) return NextResponse.json({ error: "Enter a valid website address." }, { status: 400 });
  try {
    await assertPublicUrl(url);
  } catch (err) {
    if (err instanceof BlockedUrlError) return NextResponse.json({ error: "We can only check public websites." }, { status: 400 });
    throw err;
  }

  const host = hostOf(url);
  const voice = body.audit?.brandVoice ?? {};
  const valueProposition = clip(voice.valueProposition, 400);
  const audience = clip(voice.audience, 300);
  const tone = clip(voice.tone, 120);

  // Find this site's project, or make one.
  const { data: projects } = await supabase.from("projects").select("id, website_url").eq("user_id", user.id);
  let project = (projects ?? []).find((p) => {
    try {
      return p.website_url && hostOf(normalizeAuditUrl(p.website_url) ?? "") === host;
    } catch {
      return false;
    }
  });
  if (!project) {
    const { data: created, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: host,
        website_url: url,
        value_proposition: valueProposition || null,
        target_audience: audience || null,
        brand_voice: tone || null,
      })
      .select("id, website_url")
      .single();
    if (error || !created) {
      // enforce_project_count_limit raises when the plan is full.
      return NextResponse.json(
        {
          error: "Your plan is full on websites. Upgrade, or remove a website, to add this one.",
          code: "project_limit",
        },
        { status: 409 }
      );
    }
    project = created;
  }
  const projectId = project.id;

  const service = createServiceClient();
  const { data: existing } = await service
    .from("scheduled_executions")
    .select("id")
    .eq("execution_type", FIRST_WEEK)
    .eq("parent_id", projectId)
    .maybeSingle();
  if (existing) return NextResponse.json({ projectId, started: false });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const plan = normalizePlan(profile?.plan);
  const { run, locked } = splitByPlan(plan);

  const signal = await fetchPageSignal(url, safeFetch as typeof fetch);
  const brief: SiteBrief = {
    url,
    hostname: host,
    title: signal.title,
    h1: signal.h1,
    metaDescription: signal.metaDescription,
    valueProposition,
    audience,
    tone,
    seoScore: typeof body.audit?.seoScore === "number" ? body.audit.seoScore : null,
    html: signal.html ?? "",
  };

  const { data: parent, error: parentErr } = await service
    .from("scheduled_executions")
    .insert({
      user_id: user.id,
      execution_type: FIRST_WEEK,
      // A record, not a job: never picked up by the dispatcher.
      status: "completed",
      scheduled_for: new Date().toISOString(),
      parent_type: "project",
      parent_id: projectId,
      idempotency_key: `first-week:${projectId}`,
      payload: { url, host, plan, run: run.map((a) => a.id), locked: locked.map((a) => a.id) },
      result: { previews: [], previewsReady: locked.length === 0 },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (parentErr || !parent) {
    // Lost a race with a second click: the other request owns the pack.
    return NextResponse.json({ projectId, started: false });
  }

  const { data: rows } = await service
    .from("scheduled_executions")
    .insert(
      run.map((a) => ({
        user_id: user.id,
        execution_type: FIRST_WEEK_AGENT,
        scheduled_for: new Date().toISOString(),
        parent_type: FIRST_WEEK,
        parent_id: parent.id,
        idempotency_key: `first-week:${projectId}:${a.id}`,
        max_attempts: 2,
        payload: { projectId, agentId: a.id, title: `${a.name} · ${host}`, input: firstWeekInput(a.id, brief) },
      }))
    )
    .select("id");

  const ids = (rows ?? []).map((r) => r.id as string);
  after(async () => {
    const previews = locked.length
      ? generateAgentPreviews(signal, locked.map((a) => a.id))
          .then((p) => service.from("scheduled_executions").update({ result: { previews: p, previewsReady: true } }).eq("id", parent.id))
          .catch((err) => {
            console.error("[first-week] previews failed:", err);
            return service.from("scheduled_executions").update({ result: { previews: [], previewsReady: true } }).eq("id", parent.id);
          })
      : Promise.resolve();
    await Promise.all([previews, runFirstWeekRows(service, ids)]);
  });

  return NextResponse.json({ projectId, started: true, running: ids.length, locked: locked.length });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  const includeOutput = request.nextUrl.searchParams.get("include") === "output";
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  // Ownership check through RLS.
  const { data: project } = await supabase.from("projects").select("id, name, website_url").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const { data: parent } = await service
    .from("scheduled_executions")
    .select("id, payload, result, created_at")
    .eq("execution_type", FIRST_WEEK)
    .eq("parent_id", projectId)
    .maybeSingle();
  if (!parent) return NextResponse.json({ projectId, started: false });

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
  return NextResponse.json({
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
  });
}

interface ChildRow {
  id: string;
  status: string;
  payload: { agentId: string };
  ran_at: string | null;
  last_error: string | null;
  completed_at: string | null;
  result?: { output?: unknown } | null;
}

// PATCH { projectId, agentId } — run a failed agent again.
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = rateLimit(`first-week-retry:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { projectId, agentId } = (await request.json().catch(() => ({}))) as { projectId?: string; agentId?: string };
  if (!projectId || !agentId) return NextResponse.json({ error: "projectId and agentId required" }, { status: 400 });
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const { data: row } = await service
    .from("scheduled_executions")
    .update({ status: "pending", attempts: 0, last_error: null, completed_at: null })
    .eq("idempotency_key", `first-week:${projectId}:${agentId}`)
    .eq("user_id", user.id)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Nothing to retry" }, { status: 409 });

  after(() => runFirstWeekRows(service, [row.id], 1));
  return NextResponse.json({ ok: true });
}
