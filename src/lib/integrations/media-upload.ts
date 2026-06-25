// Shared media upload helpers for X (Twitter), LinkedIn, and Facebook.
// All three platforms need media posted to their servers and then referenced
// by ID/URN when creating the post. Image upload paths are simple (single
// call). Video paths are more complex — chunked + status polling on X,
// async asset processing on LinkedIn, multi-step on Facebook.

import type { PostMedia } from "@/src/lib/media/types";
import { isVideoMedia } from "@/src/lib/media/types";
import { buildOAuth1Header, getOAuth1CredsFromEnv } from "@/src/lib/integrations/x-oauth1";

async function fetchMediaBytes(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch media (${res.status})`);
  }
  const contentType = res.headers.get("content-type") ?? "image/png";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

// Sleep helper used by the video status pollers below.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 5 MB threshold — under this, X v2 single-shot handles the upload in one
// call. Over this, we fall through to v1.1 chunked + OAuth 1.0a.
const V2_SINGLE_SHOT_LIMIT = 5 * 1024 * 1024;

export type UploadResult =
  | { ok: true; mediaId: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// X — top-level dispatch. Pick the right path based on media kind + size.
// ---------------------------------------------------------------------------

/**
 * Upload any X media (image or video) and return the X media_id. Dispatches:
 *   - image any size → v2 single-shot with media_category=tweet_image
 *   - video < 5 MB    → v2 single-shot with media_category=tweet_video
 *   - video ≥ 5 MB    → v1.1 chunked + OAuth 1.0a signature
 *
 * The OAuth 2.0 bearer token (`accessToken`) is used for v2; v1.1 chunked
 * reads its OAuth 1.0a credentials from X_OAUTH1_* env vars.
 */
export async function uploadXMedia(
  accessToken: string,
  media: PostMedia
): Promise<UploadResult> {
  if (!media.url) return { ok: false, error: "media has no url" };

  let bytes: { buffer: Buffer; contentType: string };
  try {
    bytes = await fetchMediaBytes(media.url);
  } catch (err) {
    return { ok: false, error: `fetch media bytes: ${err instanceof Error ? err.message : err}` };
  }

  const isVideo = isVideoMedia(media);
  const category = isVideo ? "tweet_video" : "tweet_image";

  if (bytes.buffer.byteLength < V2_SINGLE_SHOT_LIMIT) {
    return uploadXv2SingleShot(accessToken, bytes, category);
  }

  // Large video → v1.1 chunked with OAuth 1.0a.
  return uploadXv11Chunked(bytes, media.mimeType ?? bytes.contentType, category);
}

// ---------------------------------------------------------------------------
// X v2 single-shot upload — POST /2/media/upload, multipart, OAuth 2.0 bearer.
// Works for images of any reasonable size and for short videos (<5 MB).
// Docs: https://docs.x.com/x-api/media/quickstart/media-upload-chunked
// ---------------------------------------------------------------------------

async function uploadXv2SingleShot(
  accessToken: string,
  bytes: { buffer: Buffer; contentType: string },
  category: "tweet_image" | "tweet_video"
): Promise<UploadResult> {
  const filename = category === "tweet_video" ? "media.mp4" : "media.png";

  const form = new FormData();
  form.append(
    "media",
    new Blob([new Uint8Array(bytes.buffer)], { type: bytes.contentType }),
    filename
  );
  form.append("media_category", category);

  const res = await fetch("https://api.twitter.com/2/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      ok: false,
      error: `v2 single-shot ${res.status}: ${errText.slice(0, 200) || res.statusText}`,
    };
  }

  const data = await res.json().catch(() => ({}));
  const mediaId = data?.data?.id ?? data?.media_id_string ?? data?.id;
  if (!mediaId) {
    return { ok: false, error: `v2 single-shot returned no media_id: ${JSON.stringify(data).slice(0, 200)}` };
  }
  return { ok: true, mediaId };
}

// ---------------------------------------------------------------------------
// X v1.1 chunked upload — INIT → APPEND → FINALIZE → STATUS, all signed with
// OAuth 1.0a (consumer key/secret + access token/secret).
// Docs: https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/uploading-media/chunked-media-upload
// ---------------------------------------------------------------------------

const V11_UPLOAD_URL = "https://upload.x.com/1.1/media/upload.json";

async function uploadXv11Chunked(
  bytes: { buffer: Buffer; contentType: string },
  mimeType: string,
  category: "tweet_image" | "tweet_video"
): Promise<UploadResult> {
  const creds = getOAuth1CredsFromEnv();
  if (!creds) {
    return {
      ok: false,
      error:
        "X_OAUTH1_* env vars not set — chunked video upload requires OAuth 1.0a credentials. " +
        "See src/lib/integrations/x-oauth1.ts for env names.",
    };
  }

  const totalBytes = bytes.buffer.byteLength;

  // ---- INIT ----
  const initBody: Record<string, string> = {
    command: "INIT",
    media_type: mimeType,
    total_bytes: String(totalBytes),
    media_category: category,
  };
  const initAuth = buildOAuth1Header("POST", V11_UPLOAD_URL, initBody, {}, creds);
  const initForm = new URLSearchParams(initBody);
  const initRes = await fetch(V11_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: initAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: initForm.toString(),
  });
  if (!initRes.ok) {
    const err = await initRes.text().catch(() => "");
    return { ok: false, error: `v1.1 INIT ${initRes.status}: ${err.slice(0, 200) || initRes.statusText}` };
  }
  const initData = await initRes.json().catch(() => ({}));
  const mediaId: string | undefined =
    initData?.media_id_string ?? initData?.media_id?.toString();
  if (!mediaId) {
    return { ok: false, error: `v1.1 INIT returned no media_id: ${JSON.stringify(initData).slice(0, 200)}` };
  }

  // ---- APPEND ----
  // Multipart bodies don't include form fields in the OAuth signature
  // base string (RFC 5849 §3.4.1.3.1) — only oauth_* and query params.
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB per chunk, well under X's 5 MB cap
  let segmentIndex = 0;
  for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = bytes.buffer.subarray(offset, end);
    const appendQuery = {
      command: "APPEND",
      media_id: mediaId,
      segment_index: String(segmentIndex),
    };
    const appendUrlWithQuery = `${V11_UPLOAD_URL}?${new URLSearchParams(appendQuery).toString()}`;
    const appendAuth = buildOAuth1Header("POST", V11_UPLOAD_URL, {}, appendQuery, creds);

    const appendForm = new FormData();
    appendForm.append(
      "media",
      new Blob([new Uint8Array(chunk)], { type: mimeType }),
      `chunk-${segmentIndex}`
    );

    const appendRes = await fetch(appendUrlWithQuery, {
      method: "POST",
      headers: { Authorization: appendAuth },
      body: appendForm,
    });
    if (!appendRes.ok) {
      const err = await appendRes.text().catch(() => "");
      return {
        ok: false,
        error: `v1.1 APPEND seg=${segmentIndex} ${appendRes.status}: ${err.slice(0, 200) || appendRes.statusText}`,
      };
    }
    segmentIndex++;
  }

  // ---- FINALIZE ----
  const finalizeBody: Record<string, string> = {
    command: "FINALIZE",
    media_id: mediaId,
  };
  const finalizeAuth = buildOAuth1Header("POST", V11_UPLOAD_URL, finalizeBody, {}, creds);
  const finalizeRes = await fetch(V11_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: finalizeAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(finalizeBody).toString(),
  });
  if (!finalizeRes.ok) {
    const err = await finalizeRes.text().catch(() => "");
    return {
      ok: false,
      error: `v1.1 FINALIZE ${finalizeRes.status}: ${err.slice(0, 200) || finalizeRes.statusText}`,
    };
  }
  const finalizeData = await finalizeRes.json().catch(() => ({}));

  // ---- STATUS polling — only needed if X says async processing pending ----
  let processingInfo = finalizeData?.processing_info;
  let attempts = 0;
  const MAX_ATTEMPTS = 30; // ~2.5 min upper bound
  while (
    processingInfo?.state &&
    processingInfo.state !== "succeeded" &&
    processingInfo.state !== "failed" &&
    attempts < MAX_ATTEMPTS
  ) {
    const wait = Math.max(2000, (processingInfo.check_after_secs ?? 5) * 1000);
    await sleep(wait);
    const statusQuery = { command: "STATUS", media_id: mediaId };
    const statusUrlWithQuery = `${V11_UPLOAD_URL}?${new URLSearchParams(statusQuery).toString()}`;
    const statusAuth = buildOAuth1Header("GET", V11_UPLOAD_URL, {}, statusQuery, creds);
    const statusRes = await fetch(statusUrlWithQuery, {
      headers: { Authorization: statusAuth },
    });
    if (!statusRes.ok) {
      const err = await statusRes.text().catch(() => "");
      return {
        ok: false,
        error: `v1.1 STATUS ${statusRes.status}: ${err.slice(0, 200) || statusRes.statusText}`,
      };
    }
    const statusData = await statusRes.json().catch(() => ({}));
    processingInfo = statusData?.processing_info;
    attempts++;
  }

  if (processingInfo?.state === "failed") {
    return {
      ok: false,
      error: `v1.1 STATUS processing failed: ${JSON.stringify(processingInfo.error ?? {}).slice(0, 200)}`,
    };
  }
  if (processingInfo && processingInfo.state !== "succeeded" && attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error: `v1.1 STATUS timed out after ${attempts} polls (still ${processingInfo.state})`,
    };
  }

  return { ok: true, mediaId };
}

// ---------------------------------------------------------------------------
// Legacy thin wrappers — kept so callers that haven't migrated keep working,
// but they should be replaced with `uploadXMedia()` over time.
// ---------------------------------------------------------------------------

export async function uploadMediaToX(
  accessToken: string,
  media: PostMedia
): Promise<string | null> {
  const r = await uploadXMedia(accessToken, media);
  return r.ok ? r.mediaId : null;
}

// ---------------------------------------------------------------------------
// LinkedIn — /rest/images?action=initializeUpload + PUT upload
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/images-api
// ---------------------------------------------------------------------------

export async function uploadMediaToLinkedIn(
  accessToken: string,
  personUrn: string,
  media: PostMedia
): Promise<string | null> {
  if (!media.url) return null;

  // Step 1: Initialize upload
  const initRes = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202602",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${personUrn}`,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text().catch(() => "");
    console.error("[linkedin media init] failed:", initRes.status, err);
    throw new Error(
      `LinkedIn rejected media init (${initRes.status}): ${err.slice(0, 240) || "no body"}`
    );
  }

  const initData = await initRes.json();
  const uploadUrl: string | undefined = initData?.value?.uploadUrl;
  const imageUrn: string | undefined = initData?.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn media init returned no upload URL");
  }

  // Step 2: PUT binary to upload URL
  const { buffer, contentType } = await fetchMediaBytes(media.url);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!putRes.ok) {
    const err = await putRes.text().catch(() => "");
    console.error("[linkedin media put] failed:", putRes.status, err);
    throw new Error(
      `LinkedIn rejected media upload (${putRes.status}): ${err.slice(0, 240) || "no body"}`
    );
  }

  return imageUrn;
}

// ---------------------------------------------------------------------------
// Facebook Pages — simplest path is to POST to /{page-id}/photos with the
// image URL directly. FB fetches the image server-side. If published=false,
// FB returns a photo ID we can attach to a separate feed post.
// Docs: https://developers.facebook.com/docs/graph-api/reference/page/photos
// ---------------------------------------------------------------------------

export async function uploadMediaToFacebook(
  pageId: string,
  pageAccessToken: string,
  media: PostMedia
): Promise<string | null> {
  if (!media.url) return null;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: media.url,
        published: false,
        access_token: pageAccessToken,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[facebook photo upload] failed:", res.status, err);
    return null;
  }
  const data = await res.json();
  return data?.id ?? null;
}

// ===========================================================================
// VIDEO UPLOADS
// ===========================================================================

// ---------------------------------------------------------------------------
// X (Twitter) video — legacy wrapper. The new code dispatches through
// uploadXMedia() above (v2 single-shot for <5MB, OAuth-1.0a + v1.1 chunked
// for ≥5MB). Callers should switch to uploadXMedia().
// ---------------------------------------------------------------------------

export async function uploadVideoToX(
  accessToken: string,
  media: PostMedia
): Promise<string | null> {
  const r = await uploadXMedia(accessToken, media);
  return r.ok ? r.mediaId : null;
}

// ---------------------------------------------------------------------------
// LinkedIn — Videos API: initialize → upload binary chunks → finalize → URN
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/videos-api
// ---------------------------------------------------------------------------

export async function uploadVideoToLinkedIn(
  accessToken: string,
  personUrn: string,
  media: PostMedia
): Promise<string | null> {
  if (!media.url) return null;

  const { buffer, contentType } = await fetchMediaBytes(media.url);
  const totalBytes = buffer.byteLength;

  // Step 1: initializeUpload
  const initRes = await fetch(
    "https://api.linkedin.com/rest/videos?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202602",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${personUrn}`,
          fileSizeBytes: totalBytes,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text().catch(() => "");
    console.error("[linkedin video init] failed:", initRes.status, err);
    throw new Error(
      `LinkedIn rejected video init (${initRes.status}): ${err.slice(0, 240) || "no body"}`
    );
  }

  const initData = await initRes.json();
  const videoUrn: string | undefined = initData?.value?.video;
  const uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[] =
    initData?.value?.uploadInstructions ?? [];
  const uploadToken: string | undefined = initData?.value?.uploadToken;

  if (!videoUrn || uploadInstructions.length === 0) {
    throw new Error("LinkedIn video init returned no upload instructions");
  }

  // Step 2: PUT each chunk per LinkedIn's instructions, capturing the
  // ETag for each so we can finalize the upload.
  const etags: string[] = [];
  for (const instruction of uploadInstructions) {
    const chunk = buffer.subarray(
      instruction.firstByte,
      instruction.lastByte + 1
    );
    const putRes = await fetch(instruction.uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: new Uint8Array(chunk),
    });
    if (!putRes.ok) {
      const err = await putRes.text().catch(() => "");
      console.error("[linkedin video put] failed:", putRes.status, err);
      throw new Error(
        `LinkedIn rejected video chunk (${putRes.status}): ${err.slice(0, 240) || "no body"}`
      );
    }
    const etag = putRes.headers.get("etag");
    if (etag) etags.push(etag);
  }

  // Step 3: finalizeUpload
  const finalizeRes = await fetch(
    "https://api.linkedin.com/rest/videos?action=finalizeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202602",
      },
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken: uploadToken ?? "",
          uploadedPartIds: etags,
        },
      }),
    }
  );

  if (!finalizeRes.ok) {
    const err = await finalizeRes.text().catch(() => "");
    console.error("[linkedin video finalize] failed:", finalizeRes.status, err);
    throw new Error(
      `LinkedIn rejected video finalize (${finalizeRes.status}): ${err.slice(0, 240) || "no body"}`
    );
  }

  // LinkedIn returns the video URN. Processing happens asynchronously on
  // their side — the post will publish but the video may take a minute
  // to be playable. That's a LinkedIn-side state, not ours to manage.
  return videoUrn;
}

// ---------------------------------------------------------------------------
// Facebook Pages — /{page-id}/videos (non-resumable). For this MVP we use
// the URL-pull path, the same shape as photos: FB fetches the file.
// Docs: https://developers.facebook.com/docs/graph-api/reference/video
// ---------------------------------------------------------------------------

export async function uploadVideoToFacebook(
  pageId: string,
  pageAccessToken: string,
  media: PostMedia,
  description?: string
): Promise<string | null> {
  if (!media.url) return null;

  const params = new URLSearchParams({
    file_url: media.url,
    access_token: pageAccessToken,
  });
  if (description) {
    params.set("description", description);
  }

  const res = await fetch(
    `https://graph-video.facebook.com/v21.0/${pageId}/videos?${params}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[facebook video upload] failed:", res.status, err);
    return null;
  }
  const data = await res.json();
  // FB returns { id: "<video-id>" }. The id IS the post ID for video posts
  // when they auto-publish on upload (which the URL-pull path does).
  return data?.id ?? null;
}
