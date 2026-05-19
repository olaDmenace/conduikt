/**
 * TikTok inbox upload via the Content Posting API's PULL_FROM_URL path.
 *
 * This delivers a video to the connected user's TikTok inbox as a DRAFT.
 * The user then taps publish inside the TikTok app — no audit required
 * from TikTok beyond standard Login Kit approval.
 *
 * Direct-publish (video.publish scope, no user tap) is a separate flow
 * that requires the Content Posting API audit; we'll add it once the
 * audit clears.
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
 */

const TIKTOK_INBOX_UPLOAD_URL =
  "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";

export interface TikTokPublishResult {
  ok: boolean;
  error?: string;
  publishId?: string;
}

/**
 * Sends a video URL to TikTok which then pulls and processes the file.
 * Requires the videoUrl to be HTTPS, publicly fetchable, with no redirects.
 * Conduikt's Supabase Storage videos bucket meets these requirements.
 */
export async function uploadVideoToTikTokInbox(
  accessToken: string,
  videoUrl: string
): Promise<TikTokPublishResult> {
  if (!videoUrl) {
    return { ok: false, error: "TikTok publish requires a video URL" };
  }
  if (!/^https:\/\//.test(videoUrl)) {
    return { ok: false, error: "TikTok requires the video URL to use HTTPS" };
  }

  const res = await fetch(TIKTOK_INBOX_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail =
        parsed?.error?.message ??
        parsed?.error?.code ??
        parsed?.message ??
        text;
    } catch {
      // raw text fallback
    }

    // Common error mappings → friendlier copy
    const friendly = mapTikTokError(res.status, String(detail));
    return { ok: false, error: friendly };
  }

  const data = (await res.json().catch(() => null)) as {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string };
  } | null;

  const publishId = data?.data?.publish_id;
  if (!publishId) {
    return { ok: false, error: data?.error?.message ?? "TikTok did not return a publish ID" };
  }

  return { ok: true, publishId };
}

function mapTikTokError(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (status === 401 || lower.includes("access_token_invalid")) {
    return "TikTok session expired — reconnect from Settings → Integrations";
  }
  if (status === 403 || lower.includes("scope_not_authorized")) {
    return "TikTok blocked the upload — your account may need to re-authorise the video.upload scope";
  }
  if (lower.includes("url_ownership_unverified") || lower.includes("domain")) {
    return "TikTok rejected the video URL — domain not verified in the TikTok developer console";
  }
  if (lower.includes("rate_limit") || status === 429) {
    return "TikTok rate-limited the upload — please try again in a few minutes";
  }
  if (lower.includes("video_pull_failed") || lower.includes("download")) {
    return "TikTok could not fetch the video file — the URL may have expired or be unreachable";
  }
  if (status >= 500) {
    return "TikTok is having issues right now — please try again shortly";
  }
  return `TikTok upload failed (${status}): ${detail.slice(0, 200) || "no detail"}`;
}
