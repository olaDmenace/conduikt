// Shared media upload helpers for X (Twitter) and LinkedIn.
// Both platforms need a media URL fetched, posted to their servers, and then
// referenced by ID/URN when creating the post.

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
        "LinkedIn-Version": "202401",
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
    return null;
  }

  const initData = await initRes.json();
  const uploadUrl: string | undefined = initData?.value?.uploadUrl;
  const imageUrn: string | undefined = initData?.value?.image;

  if (!uploadUrl || !imageUrn) return null;

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
    return null;
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
