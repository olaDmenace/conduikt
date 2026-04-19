import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";
import { uploadMediaToX } from "@/src/lib/integrations/media-upload";
import { hasMedia, type PostMedia } from "@/src/lib/media/types";

function getServiceClient() {
  return createServiceClient();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, assetId, projectId, media } = (await request.json()) as {
    text: string;
    assetId?: string;
    projectId?: string;
    media?: PostMedia;
  };
  if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });
  if (text.length > 280) return NextResponse.json({ error: "Tweet exceeds 280 characters" }, { status: 400 });

  const db = getServiceClient();

  // Get connected X account
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "x")
    .single();

  if (!account) {
    return NextResponse.json({ error: "X account not connected. Connect it in Settings → Integrations." }, { status: 400 });
  }

  const accessToken = await ensureValidXToken(account);
  if (!accessToken) {
    return NextResponse.json(
      { error: "X token expired. Please reconnect your account.", reconnect: true },
      { status: 401 }
    );
  }

  // Upload media if present
  let mediaId: string | null = null;
  if (hasMedia(media)) {
    try {
      mediaId = await uploadMediaToX(accessToken, media);
    } catch (err) {
      console.error("[publish/x] media upload error:", err);
    }
    if (!mediaId) {
      return NextResponse.json(
        { error: "Failed to upload media to X. Reconnect and ensure media.write scope is granted." },
        { status: 400 }
      );
    }
  }

  // Post tweet
  const tweetBody: Record<string, unknown> = { text };
  if (mediaId) {
    tweetBody.media = { media_ids: [mediaId] };
  }

  const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tweetBody),
  });

  if (!tweetRes.ok) {
    const err = await tweetRes.json();
    const msg = err?.detail ?? err?.errors?.[0]?.message ?? "Failed to post tweet";
    if (tweetRes.status === 401) {
      await db.from("connected_accounts").delete().eq("id", account.id);
      return NextResponse.json({ error: "X token expired. Please reconnect your account.", reconnect: true }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tweet = await tweetRes.json();
  const tweetId = tweet.data?.id;
  const tweetUrl = tweetId
    ? `https://x.com/${account.platform_username}/status/${tweetId}`
    : null;

  // Update asset status if assetId provided. Use the RLS client so
  // the update silently no-ops if the caller doesn't own the asset.
  if (assetId) {
    await supabase.from("assets").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_id: tweetId ?? null,
    }).eq("id", assetId);
  }

  // Fire webhooks (non-blocking)
  dispatchWebhooks(user.id, projectId ?? null, {
    event: "post.published",
    title: "Post published to X",
    content: text,
    contentType: "social_post",
    metadata: { platform: "x", tweetId, tweetUrl },
  }).catch(() => {});

  return NextResponse.json({ success: true, tweetId, tweetUrl });
}
