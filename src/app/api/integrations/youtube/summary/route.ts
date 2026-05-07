import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getValidGoogleToken } from "@/src/lib/integrations/google-oauth";
import {
  fetchYoutubeChannelStats,
  fetchRecentVideos,
} from "@/src/lib/integrations/youtube";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // YouTube is project-scoped now — caller must pass projectId so we
  // know which connection (which channel, owned by potentially-different
  // Google accounts on different projects) to read from.
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const db = createServiceClient();
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("project_id", projectId)
    .eq("platform", "youtube")
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "YouTube not connected for this project" },
      { status: 400 }
    );
  }

  const accessToken = await getValidGoogleToken(account, db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh Google token. Please reconnect." },
      { status: 401 }
    );
  }

  try {
    const [channel, recentVideos] = await Promise.all([
      fetchYoutubeChannelStats(accessToken),
      fetchRecentVideos(accessToken, 10),
    ]);
    return NextResponse.json({ channel, recentVideos });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "YouTube fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
