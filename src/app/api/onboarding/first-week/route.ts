import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { normalizePlan } from "@/src/lib/plans";
import { normalizeAuditUrl } from "@/src/lib/onboarding/url";
import { fetchPageSignal } from "@/src/lib/onboarding/magic-audit";
import { assertPublicUrl, BlockedUrlError, safeFetch } from "@/src/lib/security/safe-fetch";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { firstWeekInput, splitByPlan, type SiteBrief } from "@/src/lib/first-week/plan";
import { generateAgentPreviews } from "@/src/lib/first-week/previews";
import { FIRST_WEEK, FIRST_WEEK_AGENT, runFirstWeekRows } from "@/src/lib/first-week/run";
import { loadFirstWeek } from "@/src/lib/first-week/status";
import { toQuickAudit } from "@/src/lib/pdf/quick-audit";

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

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const hostOf = (u: string) => new URL(u).hostname.replace(/^www\./, "");
const RERUN_AFTER_MS = 24 * 60 * 60 * 1000;

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
    /** Run on this project (its website) instead of finding one by URL. */
    projectId?: string;
    /** Run again although a pack already exists (once a day). */
    rerun?: boolean;
    audit?: { seoScore?: number; brandVoice?: { tone?: string; audience?: string; valueProposition?: string } };
  };

  // Started from a project (new-project flow, "Run every agent", "Run again").
  let given: {
    id: string;
    website_url: string | null;
    value_proposition?: string | null;
    target_audience?: unknown;
    brand_voice?: unknown;
  } | null = null;
  if (body.projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, website_url, value_proposition, target_audience, brand_voice")
      .eq("id", body.projectId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    given = data;
  }
  const url = normalizeAuditUrl(body.url ?? given?.website_url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: given ? "Add your website address in the project settings first." : "Enter a valid website address." },
      { status: 400 }
    );
  }
  try {
    await assertPublicUrl(url);
  } catch (err) {
    if (err instanceof BlockedUrlError) return NextResponse.json({ error: "We can only check public websites." }, { status: 400 });
    throw err;
  }

  const host = hostOf(url);
  const voice = body.audit?.brandVoice ?? {};
  // Fall back to what the project already knows when no fresh check came in.
  const knownAudience =
    typeof given?.target_audience === "string"
      ? given.target_audience
      : (given?.target_audience as { personas?: string[] } | null)?.personas?.[0];
  const knownTone =
    typeof given?.brand_voice === "string" ? given.brand_voice : (given?.brand_voice as { tone?: string } | null)?.tone;
  const valueProposition = clip(voice.valueProposition ?? given?.value_proposition, 400);
  const audience = clip(voice.audience ?? knownAudience, 300);
  const tone = clip(voice.tone ?? knownTone, 120);

  // Find this site's project, or make one.
  const { data: projects } = given ? { data: [] } : await supabase.from("projects").select("id, website_url").eq("user_id", user.id);
  let project = given ?? (projects ?? []).find((p) => {
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

  // Keep the quick check on the project: it becomes the Overview's site
  // score and can be downloaded later. "Try again" re-posts the same
  // result, so skip it if the last saved check matches.
  const quick = toQuickAudit(body.audit);
  if (quick) {
    const { data: last } = await supabase
      .from("audits")
      .select("score, created_at, metadata")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const repeat =
      last &&
      last.score === quick.seoScore &&
      (last.metadata as { source?: string } | null)?.source === "magic-audit" &&
      Date.now() - Date.parse(last.created_at) < 15 * 60 * 1000;
    if (!repeat) {
      await supabase.from("audits").insert({
        project_id: projectId,
        type: "seo",
        url,
        score: quick.seoScore,
        findings: quick.topIssues.map((title, i) => ({
          severity: i === 0 ? "critical" : "warning",
          category: "Quick check",
          title,
          detail: "",
          fix: "",
          impact: i === 0 ? "high" : "medium",
        })),
        metadata: { source: "magic-audit", quick },
      });
    }
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("scheduled_executions")
    .select("id, created_at")
    .eq("execution_type", FIRST_WEEK)
    .eq("parent_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && !body.rerun) return NextResponse.json({ projectId, started: false });
  if (existing && body.rerun) {
    const next = Date.parse(existing.created_at) + RERUN_AFTER_MS;
    if (Date.now() < next) {
      return NextResponse.json(
        { error: "Your agents already ran on this site today. You can run them again tomorrow.", code: "too_soon", nextAt: new Date(next).toISOString() },
        { status: 429 }
      );
    }
  }
  // Each run gets its own keys; the first run keeps the original ones.
  const runKey = existing ? `first-week:${projectId}@${Date.now()}` : `first-week:${projectId}`;

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
      idempotency_key: runKey,
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
        idempotency_key: `${runKey}:${a.id}`,
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
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, website_url, positioning_statement")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = await loadFirstWeek(createServiceClient(), projectId, includeOutput);
  const hasDirection = !!project.positioning_statement?.trim();
  return NextResponse.json(status ? { ...status, hasDirection } : { projectId, started: false, hasDirection });
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
  const { data: latest } = await service
    .from("scheduled_executions")
    .select("id")
    .eq("execution_type", FIRST_WEEK)
    .eq("parent_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return NextResponse.json({ error: "Nothing to retry" }, { status: 409 });
  const { data: row } = await service
    .from("scheduled_executions")
    .update({ status: "pending", attempts: 0, last_error: null, completed_at: null })
    .eq("parent_id", latest.id)
    .eq("execution_type", FIRST_WEEK_AGENT)
    .eq("payload->>agentId", agentId)
    .eq("user_id", user.id)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Nothing to retry" }, { status: 409 });

  after(() => runFirstWeekRows(service, [row.id], 1));
  return NextResponse.json({ ok: true });
}
