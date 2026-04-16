import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";
import { ensureValidLinkedInToken } from "@/src/lib/integrations/linkedin-token";
import {
  uploadMediaToX,
  uploadMediaToLinkedIn,
} from "@/src/lib/integrations/media-upload";
import { hasMedia, type PostMedia } from "@/src/lib/media/types";

// This route is called every 5 minutes by Supabase pg_cron + pg_net.
// It picks up pending scheduled_posts whose scheduled_for time has passed
// and publishes them via the X and LinkedIn APIs directly.
//
// The route is idempotent (only processes status='pending' posts).

function getServiceClient() {
  return createServiceClient();
}

export async function GET(request: NextRequest) {
  // Auth — only Supabase pg_cron (or internal calls with the secret) may
  // trigger this. Fail closed: in production the secret must exist AND
  // must match the caller's credential, otherwise we refuse.
  //
  // Supabase pg_cron can pass the credential two ways depending on how
  // the SQL job was written:
  //   1) Authorization header:  net.http_get(url, headers := '{"Authorization":"Bearer xxx"}')
  //   2) Query string:          net.http_get(url || '?secret=xxx')
  // We accept either so operators aren't locked into one form.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[cron/publish] CRON_SECRET is not set — refusing to run. Add it in Vercel env vars."
      );
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }
    // Local dev: allow unauthenticated calls but log a warning.
    console.warn(
      "[cron/publish] CRON_SECRET is not set — allowing unauthenticated call (dev only)"
    );
  } else {
    const authHeader = request.headers.get("authorization");
    const queryParamSecret = new URL(request.url).searchParams.get("secret");
    const headerMatches = authHeader === `Bearer ${cronSecret}`;
    const queryMatches = queryParamSecret === cronSecret;
    if (!headerMatches && !queryMatches) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
        id,
        user_id,
        access_token,
        refresh_token,
        token_expires_at,
        platform,
        platform_user_id,
        platform_username
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
    const media: PostMedia | undefined = asset?.content?.media;

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

    // Refresh tokens before publishing
    let token = account.access_token;
    if (post.channel === "x") {
      const freshToken = await ensureValidXToken(account as Parameters<typeof ensureValidXToken>[0]);
      if (!freshToken) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: "X token expired — user must reconnect" })
          .eq("id", post.id);
        results.push({ id: post.id, status: "failed", error: "X token expired" });
        continue;
      }
      token = freshToken;
    } else if (post.channel === "linkedin") {
      const freshToken = await ensureValidLinkedInToken(account as Parameters<typeof ensureValidLinkedInToken>[0]);
      if (!freshToken) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: "LinkedIn token expired — user must reconnect" })
          .eq("id", post.id);
        results.push({ id: post.id, status: "failed", error: "LinkedIn token expired" });
        continue;
      }
      token = freshToken;
    }

    try {
      let publishResult: { ok: boolean; error?: string };

      if (post.channel === "x") {
        publishResult = await publishToX(text, token, media);
      } else if (post.channel === "linkedin") {
        publishResult = await publishToLinkedIn(text, token, media);
      } else if (post.channel === "facebook") {
        publishResult = await publishToFacebook(
          text,
          account.platform_user_id ?? "",
          token,
          media
        );
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
  media?: PostMedia
): Promise<{ ok: boolean; error?: string }> {
  let mediaId: string | null = null;
  if (hasMedia(media)) {
    try {
      mediaId = await uploadMediaToX(accessToken, media);
    } catch (err) {
      return { ok: false, error: `X media upload error: ${err instanceof Error ? err.message : "unknown"}` };
    }
    if (!mediaId) {
      return { ok: false, error: "X media upload failed — scope may be missing" };
    }
  }

  const body: Record<string, unknown> = { text };
  if (mediaId) body.media = { media_ids: [mediaId] };

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    return { ok: false, error: b.detail ?? `X API error ${res.status}` };
  }
  return { ok: true };
}

async function publishToLinkedIn(
  text: string,
  accessToken: string,
  media?: PostMedia
): Promise<{ ok: boolean; error?: string }> {
  // Get author URN — requires a /me call first
  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    return { ok: false, error: `LinkedIn auth error ${meRes.status}` };
  }

  const me = await meRes.json();
  const authorId: string = me.sub;
  const authorUrn = `urn:li:person:${authorId}`;

  let imageUrn: string | null = null;
  if (hasMedia(media)) {
    try {
      imageUrn = await uploadMediaToLinkedIn(accessToken, authorId, media);
    } catch (err) {
      return { ok: false, error: `LinkedIn media upload error: ${err instanceof Error ? err.message : "unknown"}` };
    }
    if (!imageUrn) {
      return { ok: false, error: "LinkedIn media upload failed" };
    }
  }

  const specificContent: Record<string, unknown> = {
    shareCommentary: { text },
    shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
  };
  if (imageUrn) {
    specificContent.media = [
      {
        status: "READY",
        media: imageUrn,
      },
    ];
  }

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
        "com.linkedin.ugc.ShareContent": specificContent,
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

async function publishToFacebook(
  text: string,
  pageId: string,
  pageAccessToken: string,
  media?: PostMedia
): Promise<{ ok: boolean; error?: string }> {
  if (!pageId) {
    return { ok: false, error: "Facebook Page ID missing — reconnect the Page" };
  }

  const endpoint =
    hasMedia(media) && media.url
      ? `https://graph.facebook.com/v21.0/${pageId}/photos`
      : `https://graph.facebook.com/v21.0/${pageId}/feed`;

  const body =
    hasMedia(media) && media.url
      ? { url: media.url, caption: text, access_token: pageAccessToken }
      : { message: text, access_token: pageAccessToken };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: b?.error?.message ?? `Facebook API error ${res.status}`,
    };
  }
  return { ok: true };
}
