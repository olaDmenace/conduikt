import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";
import { ensureValidLinkedInToken } from "@/src/lib/integrations/linkedin-token";
import { ensureValidTikTokToken } from "@/src/lib/integrations/tiktok-token";
import { uploadVideoToTikTokInbox } from "@/src/lib/integrations/tiktok-publish";
import {
  uploadMediaToX,
  uploadMediaToLinkedIn,
} from "@/src/lib/integrations/media-upload";
import { hasMedia, isVideoMedia, type PostMedia } from "@/src/lib/media/types";
import { splitForX } from "@/src/lib/integrations/x-thread";
import { decryptToken } from "@/src/lib/crypto/tokens";

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

  // Fetch all pending posts due to be published.
  // scheduled_posts has no FK to connected_accounts (one account per
  // user-per-platform is implicit), so we resolve the account in a
  // second query keyed by (project.user_id, platform=channel).
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
      projects!inner (
        user_id
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

  // Bulk-fetch connected accounts for every user touched by this batch.
  const userIds = Array.from(
    new Set(
      posts
        .map((p) => {
          const proj = Array.isArray(p.projects) ? p.projects[0] : p.projects;
          return proj?.user_id as string | undefined;
        })
        .filter((u): u is string => Boolean(u))
    )
  );

  const { data: accounts, error: accountsError } = await supabase
    .from("connected_accounts")
    .select(
      "id, user_id, access_token, refresh_token, token_expires_at, platform, platform_user_id, platform_username"
    )
    .in("user_id", userIds);

  if (accountsError) {
    console.error("[cron/publish] Accounts query error:", accountsError);
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  // (user_id|platform) → account, e.g. "abc-123|x"
  const accountKey = (uid: string, platform: string) => `${uid}|${platform}`;
  const accountMap = new Map<string, (typeof accounts)[number]>();
  for (const a of accounts ?? []) {
    if (a.user_id && a.platform) accountMap.set(accountKey(a.user_id, a.platform), a);
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of posts) {
    const asset = Array.isArray(post.assets) ? post.assets[0] : post.assets;
    const project = Array.isArray(post.projects) ? post.projects[0] : post.projects;
    const userId = project?.user_id as string | undefined;
    const account = userId ? accountMap.get(accountKey(userId, post.channel)) : undefined;

    const text: string = asset?.content?.scheduled_text ?? asset?.content?.raw ?? "";
    const media: PostMedia | undefined = asset?.content?.media;

    // TikTok requires a video URL but the caption is optional. Every other
    // channel requires text. Compute the per-channel guard accordingly.
    const missingContent =
      post.channel === "tiktok"
        ? !(isVideoMedia(media) && media?.url)
        : !text;

    if (missingContent || !account?.access_token) {
      const reason = missingContent
        ? post.channel === "tiktok"
          ? "TikTok posts require a video — attach one before scheduling"
          : "Missing post text"
        : `No connected ${post.channel} account for this user — reconnect in Settings`;
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_message: reason,
        })
        .eq("id", post.id);
      results.push({ id: post.id, status: "failed", error: reason });
      continue;
    }

    // Decrypt the stored access token. For X/LinkedIn this is overwritten
    // below with the helper's freshly-refreshed plaintext token; for Facebook
    // (no auto-refresh path) we use this decrypted value directly.
    let token = decryptToken(account.access_token);
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
    } else if (post.channel === "tiktok") {
      const freshToken = await ensureValidTikTokToken(account as Parameters<typeof ensureValidTikTokToken>[0]);
      if (!freshToken) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: "TikTok session expired — user must reconnect" })
          .eq("id", post.id);
        results.push({ id: post.id, status: "failed", error: "TikTok token expired" });
        continue;
      }
      token = freshToken;
    }

    try {
      let publishResult: { ok: boolean; error?: string; externalId?: string };

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
      } else if (post.channel === "tiktok") {
        publishResult = await publishToTikTok(token, media);
      } else {
        publishResult = { ok: false, error: "Unknown channel" };
      }

      if (publishResult.ok) {
        const update: Record<string, unknown> = {
          status: "posted",
          posted_at: new Date().toISOString(),
        };
        if (publishResult.externalId) {
          update.external_post_id = publishResult.externalId;
        }
        await supabase
          .from("scheduled_posts")
          .update(update)
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
): Promise<{ ok: boolean; error?: string; externalId?: string }> {
  const chunks = splitForX(text);
  if (chunks.length === 0) {
    return { ok: false, error: "Empty text" };
  }

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

  // The first tweet's id is what analytics tools and links use.
  let firstTweetId: string | null = null;
  let prevTweetId: string | null = null;
  for (let i = 0; i < chunks.length; i++) {
    const body: Record<string, unknown> = { text: chunks[i] };
    if (i === 0 && mediaId) body.media = { media_ids: [mediaId] };
    if (prevTweetId) body.reply = { in_reply_to_tweet_id: prevTweetId };

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
      const msg = b.detail ?? `X API error ${res.status}`;
      if (i === 0) return { ok: false, error: msg };
      // Partial thread: count it as posted (something went up) but log the gap.
      console.error(
        `[cron/publishToX] thread broke at chunk ${i + 1}/${chunks.length}: ${msg}`
      );
      return {
        ok: true,
        error: `Thread posted ${i}/${chunks.length}: ${msg}`,
        externalId: firstTweetId ?? undefined,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { data?: { id?: string } };
    prevTweetId = data?.data?.id ?? null;
    if (i === 0) firstTweetId = prevTweetId;
    if (!prevTweetId && chunks.length > 1) {
      console.error("[cron/publishToX] X returned no tweet ID, cannot continue threading");
      return {
        ok: true,
        error: "Posted first tweet but could not chain thread",
        externalId: firstTweetId ?? undefined,
      };
    }
  }

  return { ok: true, externalId: firstTweetId ?? undefined };
}

async function publishToLinkedIn(
  text: string,
  accessToken: string,
  media?: PostMedia
): Promise<{ ok: boolean; error?: string; externalId?: string }> {
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

  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (imageUrn) {
    postBody.content = {
      media: { id: imageUrn, altText: "" },
    };
  }

  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202602",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const errText = await postRes.text().catch(() => "");
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail =
        parsed?.message ??
        parsed?.error_description ??
        parsed?.error?.message ??
        errText;
    } catch {
      // raw text fallback
    }
    return {
      ok: false,
      error: `LinkedIn API error (${postRes.status}): ${
        String(detail).slice(0, 240) || "no detail"
      }`,
    };
  }
  // LinkedIn returns the post URN in the x-restli-id response header.
  const externalId = postRes.headers.get("x-restli-id");
  return { ok: true, externalId: externalId ?? undefined };
}

async function publishToTikTok(
  accessToken: string,
  media: PostMedia | undefined
): Promise<{ ok: boolean; error?: string; externalId?: string }> {
  if (!isVideoMedia(media) || !media?.url) {
    return { ok: false, error: "TikTok publish requires an attached video" };
  }
  const result = await uploadVideoToTikTokInbox(accessToken, media.url);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  // publish_id is TikTok's handle for tracking the queued upload — store it
  // as the external_post_id so we can correlate the eventual post if/when we
  // wire the status webhook.
  return { ok: true, externalId: result.publishId };
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
