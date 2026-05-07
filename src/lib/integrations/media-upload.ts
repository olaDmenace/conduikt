// Shared media upload helpers for X (Twitter), LinkedIn, and Facebook.
// All three platforms need media posted to their servers and then referenced
// by ID/URN when creating the post. Image upload paths are simple (single
// call). Video paths are more complex — chunked + status polling on X,
// async asset processing on LinkedIn, multi-step on Facebook.

import type { PostMedia } from "@/src/lib/media/types";

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

// ---------------------------------------------------------------------------
// X (Twitter) — v2 media upload
// Docs: https://docs.x.com/x-api/media/quickstart/media-upload-chunked
// For images <5MB we can use the simple single-call upload.
// ---------------------------------------------------------------------------

export async function uploadMediaToX(
  accessToken: string,
  media: PostMedia
): Promise<string | null> {
  if (!media.url) return null;

  const { buffer, contentType } = await fetchMediaBytes(media.url);

  const form = new FormData();
  form.append(
    "media",
    new Blob([new Uint8Array(buffer)], { type: contentType }),
    "media.png"
  );
  form.append("media_category", "tweet_image");

  const res = await fetch("https://api.twitter.com/2/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[x media upload] failed:", res.status, errText);
    return null;
  }
  const data = await res.json();
  return data?.data?.id ?? data?.media_id_string ?? data?.id ?? null;
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
// X (Twitter) — chunked v1.1 media upload (still the supported path for video)
// Flow: INIT (returns media_id) → APPEND chunks (≤5MB each) → FINALIZE →
// poll STATUS until processing succeeds, then return the media_id.
// Docs: https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/uploading-media/chunked-media-upload
// ---------------------------------------------------------------------------

export async function uploadVideoToX(
  accessToken: string,
  media: PostMedia
): Promise<string | null> {
  if (!media.url) return null;

  const { buffer, contentType } = await fetchMediaBytes(media.url);
  const totalBytes = buffer.byteLength;
  const mimeType = media.mimeType ?? contentType ?? "video/mp4";

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // X chunked endpoints live at upload.x.com (formerly upload.twitter.com).
  const UPLOAD_URL = "https://upload.x.com/1.1/media/upload.json";

  // Step 1: INIT
  const initForm = new FormData();
  initForm.append("command", "INIT");
  initForm.append("media_type", mimeType);
  initForm.append("total_bytes", String(totalBytes));
  initForm.append("media_category", "tweet_video");

  const initRes = await fetch(UPLOAD_URL, {
    method: "POST",
    headers,
    body: initForm,
  });
  if (!initRes.ok) {
    const err = await initRes.text().catch(() => "");
    console.error("[x video init] failed:", initRes.status, err);
    return null;
  }
  const initData = await initRes.json();
  const mediaId: string | undefined =
    initData?.media_id_string ?? initData?.media_id?.toString();
  if (!mediaId) {
    console.error("[x video init] no media_id in response");
    return null;
  }

  // Step 2: APPEND chunks (≤5MB each — X's documented limit per chunk).
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB to stay safely under 5MB
  let segmentIndex = 0;
  for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = buffer.subarray(offset, end);
    const appendForm = new FormData();
    appendForm.append("command", "APPEND");
    appendForm.append("media_id", mediaId);
    appendForm.append("segment_index", String(segmentIndex));
    appendForm.append(
      "media",
      new Blob([new Uint8Array(chunk)], { type: mimeType }),
      `chunk-${segmentIndex}`
    );

    const appendRes = await fetch(UPLOAD_URL, {
      method: "POST",
      headers,
      body: appendForm,
    });
    if (!appendRes.ok) {
      const err = await appendRes.text().catch(() => "");
      console.error("[x video append] failed:", appendRes.status, err);
      return null;
    }
    segmentIndex++;
  }

  // Step 3: FINALIZE
  const finalizeForm = new FormData();
  finalizeForm.append("command", "FINALIZE");
  finalizeForm.append("media_id", mediaId);

  const finalizeRes = await fetch(UPLOAD_URL, {
    method: "POST",
    headers,
    body: finalizeForm,
  });
  if (!finalizeRes.ok) {
    const err = await finalizeRes.text().catch(() => "");
    console.error("[x video finalize] failed:", finalizeRes.status, err);
    return null;
  }
  const finalizeData = await finalizeRes.json();

  // Step 4: poll STATUS if FINALIZE indicates async processing.
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
    const statusUrl = `${UPLOAD_URL}?command=STATUS&media_id=${mediaId}`;
    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) {
      const err = await statusRes.text().catch(() => "");
      console.error("[x video status] failed:", statusRes.status, err);
      return null;
    }
    const statusData = await statusRes.json();
    processingInfo = statusData?.processing_info;
    attempts++;
  }

  if (processingInfo?.state === "failed") {
    console.error("[x video] processing failed:", processingInfo.error);
    return null;
  }

  return mediaId;
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
