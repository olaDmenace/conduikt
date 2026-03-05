import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("platform", "linkedin")
    .maybeSingle();

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "LinkedIn account not connected" },
      { status: 400 }
    );
  }

  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("id, project_id, external_post_id")
    .eq("channel", "linkedin")
    .eq("status", "published")
    .not("external_post_id", "is", null)
    .limit(50);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ synced: 0, metrics: [] });
  }

  const synced: Array<Record<string, unknown>> = [];

  for (const post of posts) {
    try {
      const res = await fetch(
        `https://api.linkedin.com/v2/socialActions/${post.external_post_id}`,
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      if (!res.ok) continue;

      const data = await res.json();

      const row = {
        project_id: post.project_id,
        scheduled_post_id: post.id,
        channel: "linkedin",
        external_post_id: post.external_post_id,
        impressions: 0,
        likes: data.likesSummary?.totalLikes ?? 0,
        shares: data.sharesSummary?.totalShares ?? 0,
        comments: data.commentsSummary?.totalFirstLevelComments ?? 0,
        clicks: 0,
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
