import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getGenerationLimit, normalizePlan } from "@/src/lib/plans";
import {
  dailySeries,
  windowedImpressions,
  windowedOpenRate,
  type PostedMetric,
} from "@/src/lib/dashboard/overview";

// GET /api/dashboard/overview?projectId=<uuid>
// Everything the v2 Overview screen shows, in one round trip. docs/DESIGN.md
// §Overview screen. All reads go through the user's session so RLS scopes
// them; projectId falls back to the most recent project the user can see.
const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const requested = request.nextUrl.searchParams.get("projectId");

  const [profileRes, projectsRes, queueRes, runningRes, accountsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, generation_count, onboarding_completed, full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, website_url, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("scheduled_executions")
      .select("id, payload, scheduled_for", { count: "exact" })
      .eq("user_id", user.id)
      .eq("execution_type", "playbook_action")
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true })
      .limit(1),
    supabase
      .from("scheduled_executions")
      .select("id, execution_type, payload, ran_at, scheduled_for")
      .eq("user_id", user.id)
      .eq("status", "running")
      .order("scheduled_for", { ascending: true })
      .limit(5),
    supabase.from("connected_accounts").select("platform, platform_username, project_id").eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const projects = projectsRes.data ?? [];
  const project = projects.find((p) => p.id === requested) ?? projects[0] ?? null;
  const plan = normalizePlan(profile?.plan);

  const base = {
    user: {
      firstName: (profile?.full_name || user.user_metadata?.full_name || "").split(" ")[0] || null,
      plan,
      generationsUsed: profile?.generation_count ?? 0,
      generationLimit: getGenerationLimit(plan),
      onboardingCompleted: profile?.onboarding_completed ?? false,
    },
    projects: projects.map((p) => ({ id: p.id, name: p.name, websiteUrl: p.website_url })),
    project: project ? { id: project.id, name: project.name, websiteUrl: project.website_url } : null,
  };

  // Approval queue is user-scoped (playbook actions span projects).
  const waitingCount = queueRes.count ?? 0;
  let nextApproval: null | { id: string; channel: string | null; scheduledFor: string; text: string; title: string | null } = null;
  const head = queueRes.data?.[0];
  if (head) {
    const payload = (head.payload ?? {}) as Record<string, unknown>;
    const assetId = typeof payload.assetId === "string" ? payload.assetId : null;
    let text = "";
    let title: string | null = null;
    if (assetId) {
      const { data: asset } = await supabase.from("assets").select("title, content").eq("id", assetId).maybeSingle();
      const content = (asset?.content ?? {}) as { scheduled_text?: string; raw?: string };
      text = content.scheduled_text || content.raw || "";
      title = asset?.title ?? null;
    }
    nextApproval = {
      id: head.id,
      channel: typeof payload.channel === "string" ? payload.channel : null,
      scheduledFor: head.scheduled_for,
      text,
      title,
    };
  }

  const live = (runningRes.data ?? []).map((r) => {
    const payload = (r.payload ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      type: r.execution_type,
      label: typeof payload.title === "string" ? payload.title : null,
      startedAt: r.ran_at ?? r.scheduled_for,
    };
  });

  if (!project) {
    return NextResponse.json({ ...base, waitingCount, nextApproval, live, empty: true });
  }

  const since14 = new Date(now - 14 * DAY).toISOString();
  const since60 = new Date(now - 60 * DAY).toISOString();
  const nowIso = new Date(now).toISOString();

  const [auditsRes, postedRes, upcomingRes, broadcastsRes, learningRes, historyRes, audienceRes] = await Promise.all([
    supabase
      .from("audits")
      .select("id, score, created_at")
      .eq("project_id", project.id)
      .not("score", "is", null)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("scheduled_posts")
      .select("id, channel, posted_at")
      .eq("project_id", project.id)
      .not("posted_at", "is", null)
      .gte("posted_at", since14),
    supabase
      .from("scheduled_posts")
      .select("id, channel, scheduled_for, assets (title)")
      .eq("project_id", project.id)
      .eq("status", "pending")
      .gte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(5),
    supabase
      .from("broadcasts")
      .select("sent_at, totals")
      .eq("project_id", project.id)
      .eq("status", "sent")
      .gte("sent_at", since60),
    supabase
      .from("post_learnings")
      .select("id, channel, hypothesis, confidence, generated_at")
      .eq("project_id", project.id)
      .eq("active", true)
      .order("generated_at", { ascending: false })
      .limit(1),
    supabase
      .from("assets")
      .select("id, title, type, status, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("audiences").select("id", { count: "exact", head: true }).eq("project_id", project.id),
  ]);

  // Impressions: post_metrics keyed by scheduled_post_id, bucketed by when
  // the post went out (metrics rows are cumulative per post).
  const posted = postedRes.data ?? [];
  let metrics: PostedMetric[] = [];
  if (posted.length > 0) {
    const { data: rows } = await supabase
      .from("post_metrics")
      .select("scheduled_post_id, channel, impressions")
      .in(
        "scheduled_post_id",
        posted.map((p) => p.id)
      );
    const postedAt = new Map(posted.map((p) => [p.id, p.posted_at as string]));
    metrics = (rows ?? []).map((r) => ({
      postedAt: postedAt.get(r.scheduled_post_id as string) ?? "",
      channel: r.channel,
      impressions: r.impressions ?? 0,
    }));
  }

  const audits = auditsRes.data ?? [];
  const impressions = windowedImpressions(metrics, now, 7);
  const openRate = windowedOpenRate(
    (broadcastsRes.data ?? []).map((b) => ({ sentAt: b.sent_at, totals: b.totals as BroadcastTotalsJson })),
    now,
    30
  );

  const accounts = accountsRes.data ?? [];
  const connected = (platform: string) =>
    accounts.find(
      (a) => a.platform === platform && (a.project_id === null || a.project_id === project.id)
    ) ?? null;

  const channels = [
    { key: "x", label: "X", account: connected("x"), series: dailySeries(metrics, "x", now) },
    { key: "linkedin", label: "LinkedIn", account: connected("linkedin"), series: dailySeries(metrics, "linkedin", now) },
  ].map((c) => ({
    key: c.key,
    label: c.label,
    connected: !!c.account,
    handle: c.account?.platform_username ?? null,
    series: c.series,
    total: c.series.reduce((a, b) => a + b, 0),
  }));
  channels.push({
    key: "email",
    label: "Email",
    connected: (audienceRes.count ?? 0) > 0,
    handle: null,
    series: [],
    total: openRate.delivered,
  });
  channels.push({
    key: "gsc",
    label: "Search Console",
    connected: !!connected("gsc"),
    handle: null,
    series: [],
    total: 0,
  });

  const upcoming = (upcomingRes.data ?? []).map((p) => ({
    id: p.id,
    channel: p.channel,
    scheduledFor: p.scheduled_for,
    title: (p.assets as unknown as { title: string | null } | null)?.title ?? null,
  }));

  return NextResponse.json({
    ...base,
    empty: false,
    waitingCount,
    nextApproval,
    live,
    kpis: {
      seo: audits[0]
        ? { score: audits[0].score as number, previous: (audits[1]?.score as number | undefined) ?? null, at: audits[0].created_at }
        : null,
      impressions: { current: impressions.current, previous: impressions.previous, posts: posted.length },
      openRate,
      nextPublish: upcoming[0] ?? null,
    },
    upcoming,
    history: historyRes.data ?? [],
    learning: learningRes.data?.[0] ?? null,
    channels,
  });
}

type BroadcastTotalsJson = { delivered?: number; opened?: number } | null;
