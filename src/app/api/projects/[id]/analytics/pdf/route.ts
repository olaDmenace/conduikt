import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AnalyticsReportDocument } from "@/src/lib/pdf/analytics-report";

const agentLabels: Record<string, string> = {
  "seo-audit": "SEO Audit",
  "page-cro": "Page CRO",
  copywriting: "Copywriting",
  "social-content": "Social Content",
  "email-sequence": "Email Sequence",
  "content-strategy": "Content Strategy",
  "competitor-analysis": "Competitor Analysis",
  "blog-post": "Blog Post",
  "keyword-research": "Keyword Research",
  "growth-playbook": "Growth Playbook",
};

export async function GET(
  _request: NextRequest,
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

  // Check plan — Agency only
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan !== "agency") {
    return NextResponse.json(
      { error: "PDF reports are available on the Agency plan" },
      { status: 402 }
    );
  }

  // Fetch project with branding
  const { data: project } = await supabase
    .from("projects")
    .select("name, website_url, client_name, client_logo_url, report_accent_color")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch analytics data
  const [genResult, assetResult, gscResult] = await Promise.all([
    supabase
      .from("ai_generations")
      .select("agent_used, input_tokens, output_tokens, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("assets")
      .select("id")
      .eq("project_id", id),
    supabase
      .from("keyword_data")
      .select("term, clicks, impressions, position")
      .eq("project_id", id)
      .order("clicks", { ascending: false })
      .limit(20),
  ]);

  const generations = genResult.data ?? [];
  const totalGenerations = generations.length;
  const totalTokens = generations.reduce(
    (sum, g) => sum + (g.input_tokens ?? 0) + (g.output_tokens ?? 0),
    0
  );
  const totalAssets = assetResult.data?.length ?? 0;

  // Agent breakdown
  const agentCounts: Record<string, number> = {};
  for (const g of generations) {
    agentCounts[g.agent_used] = (agentCounts[g.agent_used] ?? 0) + 1;
  }
  const agentBreakdown = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([agent, count]) => ({
      agent: agentLabels[agent] ?? agent,
      count,
      pct: totalGenerations > 0 ? Math.round((count / totalGenerations) * 100) : 0,
    }));

  // Content velocity (weekly)
  const weekCounts: Record<string, number> = {};
  for (const g of generations) {
    const d = new Date(g.created_at);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const wk = monday.toISOString().slice(0, 10);
    weekCounts[wk] = (weekCounts[wk] ?? 0) + 1;
  }
  const contentVelocity = Object.keys(weekCounts)
    .sort()
    .slice(-8)
    .map((wk) => ({
      week: new Date(wk).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: weekCounts[wk],
    }));

  const gscKeywords = (gscResult.data ?? []).map((k) => ({
    term: k.term,
    clicks: k.clicks ?? 0,
    impressions: k.impressions ?? 0,
    position: k.position ?? 0,
  }));

  const doc = React.createElement(AnalyticsReportDocument, {
    projectName: project.name || "Project",
    url: project.website_url || "",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    totalGenerations,
    totalTokens,
    totalAssets,
    agentBreakdown,
    gscKeywords,
    contentVelocity,
    branding: {
      clientName: project.client_name,
      clientLogoUrl: project.client_logo_url,
      reportAccentColor: project.report_accent_color,
      agencyName: profile?.full_name,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conduikt-analytics-${id.slice(0, 8)}.pdf"`,
    },
  });
}
