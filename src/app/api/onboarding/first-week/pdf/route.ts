import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { loadFirstWeek } from "@/src/lib/first-week/status";
import { FirstWeekReportDocument, type ReportAgent } from "@/src/lib/pdf/first-week-report";
import { reportDate, safeFileHost, toQuickAudit } from "@/src/lib/pdf/quick-audit";
import { tierLabel, type PlanTier } from "@/src/lib/plans";

// GET ?projectId=… → the project's site check + first-week work as one PDF.
// Downloadable any time after the run, from the results page or Overview.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = rateLimit(`first-week-pdf:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  // Ownership through RLS.
  const { data: project } = await supabase.from("projects").select("id, name, website_url").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [status, auditRes] = await Promise.all([
    loadFirstWeek(createServiceClient(), projectId, true),
    supabase
      .from("audits")
      .select("metadata, created_at")
      .eq("project_id", projectId)
      .eq("metadata->>source", "magic-audit")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const audit = toQuickAudit((auditRes.data?.metadata as { quick?: unknown } | null)?.quick);
  if (!status && !audit) return NextResponse.json({ error: "Nothing to download yet." }, { status: 404 });

  let host = status?.host ?? project.name;
  try {
    if (!status?.host && project.website_url) host = new URL(project.website_url).hostname.replace(/^www\./, "");
  } catch {}

  const agents: ReportAgent[] = (status?.agents ?? []).map((a) => ({
    name: a.name,
    job: a.job,
    state: a.state as ReportAgent["state"],
    tier: tierLabel(a.tier as PlanTier),
    output: "output" in a ? a.output : undefined,
    preview: "preview" in a ? a.preview : null,
  }));

  const doc = React.createElement(FirstWeekReportDocument, { host, date: reportDate(), audit, agents });
  let buffer: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffer = await renderToBuffer(doc as any);
  } catch (err) {
    console.error("[report-pdf] render failed:", err);
    const detail = process.env.NODE_ENV === "development" && err instanceof Error ? `: ${err.message}` : "";
    return NextResponse.json({ error: `We couldn't build the PDF${detail}` }, { status: 500 });
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conduikt-${safeFileHost(host)}-first-week.pdf"`,
    },
  });
}
