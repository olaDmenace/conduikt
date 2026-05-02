import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get X connected account
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("id, user_id, access_token, refresh_token, token_expires_at, platform_username")
    .eq("user_id", user.id)
    .eq("platform", "x")
    .maybeSingle();

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "X account not connected" },
      { status: 400 }
    );
  }

  // Ensure token is fresh
  const validToken = await ensureValidXToken(account);
  if (!validToken) {
    return NextResponse.json(
      { error: "X token expired. Please reconnect your account." },
      { status: 401 }
    );
  }

  // Get published X posts with external IDs
  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("id, project_id, external_post_id")
    .eq("channel", "x")
    .eq("status", "posted")
    .not("external_post_id", "is", null)
    .limit(50);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ synced: 0, metrics: [] });
  }

  const synced: Array<Record<string, unknown>> = [];

  for (const post of posts) {
    try {
      const res = await fetch(
        `https://api.x.com/2/tweets/${post.external_post_id}?tweet.fields=public_metrics`,
        {
          headers: { Authorization: `Bearer ${validToken}` },
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const m = data.data?.public_metrics;
      if (!m) continue;

      const row = {
        project_id: post.project_id,
        scheduled_post_id: post.id,
        channel: "x",
        external_post_id: post.external_post_id,
        impressions: m.impression_count ?? 0,
        likes: m.like_count ?? 0,
        shares: m.retweet_count ?? 0,
        comments: m.reply_count ?? 0,
        clicks: m.url_link_clicks ?? 0,
        synced_at: new Date().toISOString(),
      };

      await supabase.from("post_metrics").upsert(row, {
        onConflict: "scheduled_post_id,channel",
        ignoreDuplicates: false,
      });

      synced.push(row);
    } catch {
      // Skip individual failures
    }
  }

  return NextResponse.json({ synced: synced.length, metrics: synced });
}
