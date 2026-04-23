import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getValidGoogleToken } from "@/src/lib/integrations/google-oauth";
import {
  fetchYoutubeChannelStats,
  fetchRecentVideos,
} from "@/src/lib/integrations/youtube";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "youtube")
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "YouTube not connected" },
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
