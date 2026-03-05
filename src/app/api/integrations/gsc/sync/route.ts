import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  getValidGscToken,
  fetchSearchAnalytics,
} from "@/src/lib/integrations/gsc";

function getServiceClient() {
  return createServiceClient();
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();

  // Get connected GSC account
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "google_search_console")
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "GSC not connected. Connect it in Settings." },
      { status: 400 }
    );
  }

  // Refresh token if needed
  const accessToken = await getValidGscToken(account, db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh GSC token. Please reconnect." },
      { status: 401 }
    );
  }

  // Determine site URL — prefer project's gsc_site_url, fall back to platform_username
  const siteUrl = account.platform_username;
  if (!siteUrl) {
    return NextResponse.json(
      { error: "No site URL found for GSC account." },
      { status: 400 }
    );
  }

  // Get user's projects to upsert keyword data
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id);

  if (!projects?.length) {
    return NextResponse.json(
      { error: "No projects found" },
      { status: 400 }
    );
  }

  const projectId = projects[0].id;
  const days = 28;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const queries = await fetchSearchAnalytics(siteUrl, accessToken, days);

  // Upsert into keyword_data
  if (queries.length > 0) {
    const rows = queries.map((q) => ({
      project_id: projectId,
      term: q.term,
      source: "gsc",
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.ctr,
      position: q.position,
      date_range_start: startDate.toISOString().slice(0, 10),
      date_range_end: endDate.toISOString().slice(0, 10),
    }));

    const { error } = await db.from("keyword_data").upsert(rows, {
      onConflict: "project_id,term,source",
    });

    if (error) {
      console.error("[gsc/sync] Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    synced: queries.length,
    topQueries: queries.slice(0, 10),
  });
}
