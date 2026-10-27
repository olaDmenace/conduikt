import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  getAdInsightsSummary,
  isMetaAdsEnabled,
  META_ADS_WAITING_MESSAGE,
} from "@/src/lib/integrations/meta-ads";

// GET /api/integrations/meta-ads/summary?projectId=&days=7
// Reads the ad_insights table only (the Inngest sync fills it every six
// hours). Never calls Meta, so it is cheap and works offline. A project
// without a connection gets { connected: false, reason } with 200.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (!isMetaAdsEnabled()) {
    return NextResponse.json({ connected: false, reason: META_ADS_WAITING_MESSAGE });
  }

  const daysRaw = Number(url.searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 7;

  try {
    const summary = await getAdInsightsSummary(createServiceClient(), projectId, days);
    if (!summary.connected) {
      return NextResponse.json({
        ...summary,
        reason: "Meta Ads is not connected for this project",
      });
    }
    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read ad insights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
