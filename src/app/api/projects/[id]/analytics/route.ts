import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

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

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [
    generationsRes,
    auditsRes,
    assetsRes,
    gscKeywordsRes,
    gscAccountRes,
    ga4AccountRes,
    youtubeAccountRes,
    postMetricsRes,
    keywordTrackingRes,
  ] = await Promise.all([
    supabase
      .from("ai_generations")
      .select(
        "id, agent_used, input_tokens, output_tokens, model, duration_ms, created_at"
      )
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("audits")
      .select("id, type, url, score, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("assets")
      .select("id, type, channel, status, created_at")
      .eq("project_id", id),
    supabase
      .from("keyword_data")
      .select(
        "term, clicks, impressions, ctr, position, date_range_start, date_range_end"
      )
      .eq("project_id", id)
      .eq("source", "gsc")
      .order("clicks", { ascending: false })
      .limit(100),
    supabase
      .from("connected_accounts")
      .select("id, platform_username")
      .eq("user_id", user.id)
      .eq("platform", "gsc")
      .maybeSingle(),
    supabase
      .from("connected_accounts")
      .select("id, platform_user_id")
      .eq("user_id", user.id)
      .eq("platform", "ga4")
      .maybeSingle(),
    supabase
      .from("connected_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "youtube")
      .maybeSingle(),
    supabase
      .from("post_metrics")
      .select(
        "id, channel, impressions, likes, shares, comments, clicks, synced_at, created_at"
      )
      .eq("project_id", id)
      .order("synced_at", { ascending: false }),
    supabase
      .from("keyword_data")
      .select("term, position, date_range_start")
      .eq("project_id", id)
      .eq("source", "gsc")
      .order("date_range_start", { ascending: true }),
  ]);

  return NextResponse.json({
    generations: generationsRes.data ?? [],
    audits: auditsRes.data ?? [],
    assets: assetsRes.data ?? [],
    gscKeywords: gscKeywordsRes.data ?? [],
    gscConnected: !!gscAccountRes.data,
    // GA4 needs a property selected to be useful — flag both states so the
    // client can show "connect a property" guidance vs "not connected at all".
    ga4Connected: !!ga4AccountRes.data,
    ga4HasProperty: !!ga4AccountRes.data?.platform_user_id,
    youtubeConnected: !!youtubeAccountRes.data,
    postMetrics: postMetricsRes.data ?? [],
    keywordTracking: keywordTrackingRes.data ?? [],
  });
}
