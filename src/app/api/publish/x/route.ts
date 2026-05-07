import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";
import { uploadMediaToX, uploadVideoToX } from "@/src/lib/integrations/media-upload";
import { hasMedia, isVideoMedia, type PostMedia } from "@/src/lib/media/types";
import { splitForX } from "@/src/lib/integrations/x-thread";

function getServiceClient() {
  return createServiceClient();
}

async function postOneTweet(
  accessToken: string,
  body: Record<string, unknown>
): Promise<
  | { ok: true; tweetId: string }
  | { ok: false; status: number; error: string }
> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      detail?: string;
      errors?: { message?: string }[];
    };
    const msg =
      err.detail ??
      err.errors?.[0]?.message ??
      `X rejected the post (${res.status})`;
    return { ok: false, status: res.status, error: msg };
  }
  const data = await res.json();
  const id: string | undefined = data?.data?.id;
  if (!id) return { ok: false, status: 500, error: "X returned no tweet ID" };
  return { ok: true, tweetId: id };
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

  const chunks = splitForX(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const db = getServiceClient();

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

  // Upload media if present — attached only to the first tweet of the thread.
  // Video goes through chunked upload + status polling; image is single-call.
  let mediaId: string | null = null;
  if (hasMedia(media)) {
    try {
      mediaId = isVideoMedia(media)
        ? await uploadVideoToX(accessToken, media)
        : await uploadMediaToX(accessToken, media);
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

  // Post chunk-by-chunk, threading subsequent ones as replies to the previous.
  const tweetIds: string[] = [];
  let prevTweetId: string | null = null;
  let partialFailure: { atIndex: number; intended: number; error: string } | null = null;

  for (let i = 0; i < chunks.length; i++) {
    const body: Record<string, unknown> = { text: chunks[i] };
    if (i === 0 && mediaId) {
      body.media = { media_ids: [mediaId] };
    }
    if (prevTweetId) {
      body.reply = { in_reply_to_tweet_id: prevTweetId };
    }

    const result = await postOneTweet(accessToken, body);
    if (!result.ok) {
      if (result.status === 401) {
        await db.from("connected_accounts").delete().eq("id", account.id);
        if (i === 0) {
          return NextResponse.json(
            { error: "X token expired. Please reconnect your account.", reconnect: true },
            { status: 401 }
          );
        }
      }
      if (i === 0) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      partialFailure = { atIndex: i, intended: chunks.length, error: result.error };
      break;
    }

    tweetIds.push(result.tweetId);
    prevTweetId = result.tweetId;
  }

  const firstTweetId = tweetIds[0] ?? null;
  const tweetUrl = firstTweetId
    ? `https://x.com/${account.platform_username}/status/${firstTweetId}`
    : null;

  if (assetId && firstTweetId) {
    await supabase
      .from("assets")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_id: firstTweetId,
      })
      .eq("id", assetId);
  }

  if (firstTweetId) {
    dispatchWebhooks(user.id, projectId ?? null, {
      event: "post.published",
      title:
        tweetIds.length > 1
          ? `Thread of ${tweetIds.length} tweets published to X`
          : "Post published to X",
      content: text,
      contentType: "social_post",
      metadata: {
        platform: "x",
        tweetId: firstTweetId,
        tweetUrl,
        threadIds: tweetIds,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    success: !partialFailure,
    tweetId: firstTweetId,
    tweetUrl,
    threadIds: tweetIds,
    posted: tweetIds.length,
    intended: chunks.length,
    ...(partialFailure ? { partialFailure } : {}),
  });
}
