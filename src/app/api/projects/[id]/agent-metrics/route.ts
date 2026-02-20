import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export interface AgentMetrics {
  primary: string | null;
  secondary: string | null;
  lastUsed: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Parallel queries
  const [auditsRes, assetsRes, generationsRes] = await Promise.all([
    supabase
      .from("audits")
      .select("score, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("assets")
      .select("type, channel, created_at")
      .eq("project_id", id),
    supabase
      .from("ai_generations")
      .select("agent_used, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const audits = auditsRes.data ?? [];
  const assets = assetsRes.data ?? [];
  const generations = generationsRes.data ?? [];

  // Helper: last generation for a skill
  function lastGen(skillId: string) {
    return generations.find((g) => g.agent_used === skillId)?.created_at ?? null;
  }

  // Helper: asset count + last
  function assetStats(filter: (a: (typeof assets)[0]) => boolean) {
    const filtered = assets.filter(filter);
    const last = filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]?.created_at;
    return { count: filtered.length, last: last ?? null };
  }

  const metrics: Record<string, AgentMetrics> = {};

  // SEO Audit
  if (audits.length > 0) {
    const latest = audits[audits.length - 1];
    const first = audits[0];
    const delta =
      audits.length > 1 && latest.score != null && first.score != null
        ? latest.score - first.score
        : null;
    metrics["seo-audit"] = {
      primary: latest.score != null ? `${latest.score}/100` : null,
      secondary:
        delta != null
          ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} pts`
          : `${audits.length} audit${audits.length !== 1 ? "s" : ""}`,
      lastUsed: latest.created_at,
    };
  } else {
    metrics["seo-audit"] = { primary: "No audits yet", secondary: null, lastUsed: null };
  }

  // Copywriting
  const copyStats = assetStats(
    (a) => a.type === "copy" || a.type === "copywriting"
  );
  // Fallback to ai_generations
  const copyLast = copyStats.last ?? lastGen("copywriting");
  metrics["copywriting"] = {
    primary: copyStats.count > 0 ? `${copyStats.count} piece${copyStats.count !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: copyLast,
  };

  // Social Content
  const socialStats = assetStats(
    (a) => a.channel === "x" || a.channel === "linkedin"
  );
  const socialLast = socialStats.last ?? lastGen("social-content");
  metrics["social-content"] = {
    primary: socialStats.count > 0 ? `${socialStats.count} post${socialStats.count !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: socialLast,
  };

  // Blog
  const blogStats = assetStats((a) => a.type === "blog_post");
  const blogLast = blogStats.last ?? lastGen("blog-post");
  metrics["blog-post"] = {
    primary: blogStats.count > 0 ? `${blogStats.count} post${blogStats.count !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: blogLast,
  };

  // Email sequence
  const emailStats = assetStats((a) => a.type === "email_sequence");
  const emailLast = emailStats.last ?? lastGen("email-sequence");
  metrics["email-sequence"] = {
    primary: emailStats.count > 0 ? `${emailStats.count} sequence${emailStats.count !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: emailLast,
  };

  // Content Strategy
  const strategyLast = lastGen("content-strategy");
  metrics["content-strategy"] = {
    primary: strategyLast ? "Plan generated" : "Not used yet",
    secondary: null,
    lastUsed: strategyLast,
  };

  // Competitor Analysis
  const competitorGens = generations.filter(
    (g) => g.agent_used === "competitor-analysis"
  ).length;
  const competitorLast = lastGen("competitor-analysis");
  metrics["competitor-analysis"] = {
    primary: competitorGens > 0 ? `${competitorGens} run${competitorGens !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: competitorLast,
  };

  // Keyword Research
  const keywordGens = generations.filter(
    (g) => g.agent_used === "keyword-research"
  ).length;
  const keywordLast = lastGen("keyword-research");
  metrics["keyword-research"] = {
    primary: keywordGens > 0 ? `${keywordGens} research run${keywordGens !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: keywordLast,
  };

  // Growth Playbook
  const growthGens = generations.filter(
    (g) => g.agent_used === "growth-playbook"
  ).length;
  const growthLast = lastGen("growth-playbook");
  metrics["growth-playbook"] = {
    primary: growthGens > 0 ? `${growthGens} playbook${growthGens !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: growthLast,
  };

  // Page CRO
  const croGens = generations.filter((g) => g.agent_used === "page-cro").length;
  const croLast = lastGen("page-cro");
  metrics["page-cro"] = {
    primary: croGens > 0 ? `${croGens} analysis run${croGens !== 1 ? "s" : ""}` : "Not used yet",
    secondary: null,
    lastUsed: croLast,
  };

  // Resolve lastUsed to human-readable form
  const result: Record<string, AgentMetrics & { lastUsedLabel: string | null }> = {};
  for (const [key, m] of Object.entries(metrics)) {
    result[key] = {
      ...m,
      lastUsedLabel: m.lastUsed ? timeAgo(m.lastUsed) : null,
    };
  }

  return NextResponse.json(result);
}
