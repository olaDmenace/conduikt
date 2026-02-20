import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route is called every 5 minutes by Supabase pg_cron + pg_net.
// It picks up pending scheduled_posts whose scheduled_for time has passed
// and publishes them via the X and LinkedIn APIs directly.
//
// The route is idempotent (only processes status='pending' posts).

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  // Auth — only Vercel cron (or internal calls with the secret) may trigger this
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  // Fetch all pending posts due to be published
  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select(`
      id,
      channel,
      project_id,
      asset_id,
      assets (
        id,
        content,
        title
      ),
      connected_accounts!inner (
        access_token,
        refresh_token,
        platform
      )
    `)
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(50);

  if (error) {
    console.error("[cron/publish] DB query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of posts) {
    const asset = Array.isArray(post.assets) ? post.assets[0] : post.assets;
    const account = Array.isArray(post.connected_accounts)
      ? post.connected_accounts[0]
      : post.connected_accounts;

    const text: string = asset?.content?.scheduled_text ?? asset?.content?.raw ?? "";

    if (!text || !account?.access_token) {
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_message: "Missing post text or account credentials",
        })
        .eq("id", post.id);
      results.push({ id: post.id, status: "failed", error: "Missing content or credentials" });
      continue;
    }

    try {
      let publishResult: { ok: boolean; error?: string };

      if (post.channel === "x") {
        publishResult = await publishToX(text, account.access_token, post.asset_id);
      } else if (post.channel === "linkedin") {
        publishResult = await publishToLinkedIn(text, account.access_token, post.asset_id);
      } else {
        publishResult = { ok: false, error: "Unknown channel" };
      }

      if (publishResult.ok) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "posted", posted_at: new Date().toISOString() })
          .eq("id", post.id);

        // Mark the linked asset as published
        if (post.asset_id) {
          await supabase
            .from("assets")
            .update({ status: "published" })
            .eq("id", post.asset_id);
        }

        results.push({ id: post.id, status: "posted" });
      } else {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: publishResult.error ?? "Publish failed" })
          .eq("id", post.id);
        results.push({ id: post.id, status: "failed", error: publishResult.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("scheduled_posts")
        .update({ status: "failed", error_message: msg })
        .eq("id", post.id);
      results.push({ id: post.id, status: "failed", error: msg });
    }
  }

  const published = results.filter((r) => r.status === "posted").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`[cron/publish] Done — ${published} posted, ${failed} failed`);
  return NextResponse.json({ published, failed, results });
}

// ---------------------------------------------------------------------------
// Platform publish helpers (call the APIs directly with the stored token)
// ---------------------------------------------------------------------------

async function publishToX(
  text: string,
  accessToken: string,
  assetId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.detail ?? `X API error ${res.status}` };
  }
  return { ok: true };
}

async function publishToLinkedIn(
  text: string,
  accessToken: string,
  assetId: string | null
): Promise<{ ok: boolean; error?: string }> {
  // Get author URN — requires a /me call first
  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    return { ok: false, error: `LinkedIn auth error ${meRes.status}` };
  }

  const me = await meRes.json();
  const authorUrn = `urn:li:person:${me.sub}`;

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  if (!postRes.ok) {
    const body = await postRes.json().catch(() => ({}));
    return { ok: false, error: body.message ?? `LinkedIn API error ${postRes.status}` };
  }
  return { ok: true };
}
