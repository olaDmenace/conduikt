import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/src/lib/supabase/service";
import { decryptToken } from "@/src/lib/crypto/tokens";

// Instagram publishing through the Graph API.
//
// There is no separate Instagram OAuth. An Instagram Business or Creator
// account is linked to a Facebook Page, and the Page access token already
// stored on the user's 'facebook' connected_accounts row can act on it.
// Flow (Meta "Content Publishing"):
//   1. GET  /{page-id}?fields=instagram_business_account   -> ig user id
//   2. POST /{ig-user-id}/media   (image_url | video_url, caption) -> container
//   3. video only: GET /{container-id}?fields=status_code until FINISHED
//   4. POST /{ig-user-id}/media_publish (creation_id)       -> media id
//
// The same NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION flag gates it: both need
// Meta's business verification, which the owner is still waiting on. With
// the flag off every entry point returns a clear "not available" result
// and never calls Meta.

export const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/** Hard cap on how long we wait for a video container to finish processing. */
export const VIDEO_POLL_CAP_MS = 60_000;
const VIDEO_POLL_INTERVAL_MS = 3_000;

export type InstagramMediaType = "image" | "video";

export interface PublishToInstagramInput {
  projectId: string;
  userId: string;
  caption: string;
  mediaUrl: string;
  mediaType: InstagramMediaType;
}

export interface InstagramAccount {
  /** The Instagram user id used in /media and /media_publish calls. */
  igUserId: string;
  username: string | null;
  pageId: string;
  /** Decrypted Page access token. Never persist or log it. */
  pageToken: string;
}

export type InstagramAccountResult =
  | { connected: true; account: InstagramAccount }
  | { connected: false; reason: string };

export type PublishResult =
  | { ok: true; externalId: string; permalink: string | null }
  | { ok: false; error: string };

export function isInstagramEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION === "true";
}

export const INSTAGRAM_WAITING_MESSAGE =
  "Instagram posting is waiting on Meta's business verification";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

interface GraphError {
  error?: { message?: string; code?: number; error_subcode?: number };
}

async function graphErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as GraphError;
  return body?.error?.message ?? `${fallback} (${res.status})`;
}

// ---------------------------------------------------------------------------
// Pure Graph API helpers (no database). Tests mock global fetch.
// ---------------------------------------------------------------------------

/** Step 1: find the Instagram account linked to a Facebook Page. */
export async function discoverInstagramAccount(
  pageId: string,
  pageToken: string
): Promise<{ igUserId: string; username: string | null } | null> {
  const params = new URLSearchParams({
    fields: "instagram_business_account{id,username}",
    access_token: pageToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${pageId}?${params}`);
  if (!res.ok) {
    throw new Error(await graphErrorMessage(res, "Could not read the Facebook Page"));
  }
  const data = (await res.json()) as {
    instagram_business_account?: { id?: string; username?: string };
  };
  const ig = data.instagram_business_account;
  if (!ig?.id) return null;
  return { igUserId: ig.id, username: ig.username ?? null };
}

/** Step 2: create a media container. Returns the container (creation) id. */
export async function createMediaContainer(
  igUserId: string,
  pageToken: string,
  input: { caption: string; mediaUrl: string; mediaType: InstagramMediaType }
): Promise<string> {
  const body: Record<string, string> = {
    caption: input.caption,
    access_token: pageToken,
  };
  if (input.mediaType === "video") {
    // Reels is the only video surface Meta still accepts for new posts.
    body.media_type = "REELS";
    body.video_url = input.mediaUrl;
  } else {
    body.image_url = input.mediaUrl;
  }
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await graphErrorMessage(res, "Instagram did not accept the media"));
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Instagram returned no container id");
  return data.id;
}

/**
 * Step 3 (video): poll the container until Meta has finished processing.
 * Resolves when status_code is FINISHED; throws on ERROR/EXPIRED or when the
 * cap is reached. `sleep` is injectable so tests do not wait.
 */
export async function waitForContainer(
  containerId: string,
  pageToken: string,
  opts: {
    capMs?: number;
    intervalMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
  } = {}
): Promise<void> {
  const capMs = opts.capMs ?? VIDEO_POLL_CAP_MS;
  const intervalMs = opts.intervalMs ?? VIDEO_POLL_INTERVAL_MS;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const started = now();

  for (;;) {
    const params = new URLSearchParams({
      fields: "status_code,status",
      access_token: pageToken,
    });
    const res = await fetch(`${GRAPH_BASE}/${containerId}?${params}`);
    if (!res.ok) {
      throw new Error(await graphErrorMessage(res, "Could not check the video upload"));
    }
    const data = (await res.json()) as { status_code?: string; status?: string };
    const code = data.status_code ?? "";
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(
        `Instagram could not process the video${data.status ? `: ${data.status}` : ""}`
      );
    }
    if (now() - started >= capMs) {
      throw new Error("Instagram is still processing the video after 60 seconds. Try again in a few minutes.");
    }
    await sleep(intervalMs);
  }
}

/** Step 4: publish the container. Returns the Instagram media id. */
export async function publishContainer(
  igUserId: string,
  pageToken: string,
  creationId: string
): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: pageToken }),
  });
  if (!res.ok) {
    throw new Error(await graphErrorMessage(res, "Instagram did not publish the post"));
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Instagram returned no media id");
  return data.id;
}

/** Best-effort: fetch the public link for a published media id. */
export async function fetchPermalink(mediaId: string, pageToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ fields: "permalink", access_token: pageToken });
    const res = await fetch(`${GRAPH_BASE}/${mediaId}?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { permalink?: string };
    return data.permalink ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Database-aware entry points
// ---------------------------------------------------------------------------

/**
 * Resolve the Instagram account for a user through their Facebook Page
 * connection. Never throws for "not connected" cases; those come back as
 * { connected: false, reason } in plain words.
 */
export async function getInstagramAccount(
  input: { projectId: string; userId: string },
  db: Db = createServiceClient()
): Promise<InstagramAccountResult> {
  if (!isInstagramEnabled()) {
    return { connected: false, reason: INSTAGRAM_WAITING_MESSAGE };
  }

  const { data: account } = await db
    .from("connected_accounts")
    .select("platform_user_id, access_token")
    .eq("user_id", input.userId)
    .eq("platform", "facebook")
    .maybeSingle();

  if (!account?.platform_user_id || !account.access_token) {
    return {
      connected: false,
      reason: "Connect your Facebook Page first. Instagram posts go out through the Instagram account linked to that Page.",
    };
  }

  let pageToken: string;
  try {
    pageToken = decryptToken(account.access_token as string);
  } catch {
    return { connected: false, reason: "The saved Facebook connection could not be read. Reconnect the Page." };
  }

  let discovered: { igUserId: string; username: string | null } | null;
  try {
    discovered = await discoverInstagramAccount(account.platform_user_id as string, pageToken);
  } catch (err) {
    return { connected: false, reason: err instanceof Error ? err.message : "Could not reach Instagram" };
  }

  if (!discovered) {
    return {
      connected: false,
      reason: "No Instagram account is linked to your Facebook Page. Link a Business or Creator account in Instagram settings, then try again.",
    };
  }

  return {
    connected: true,
    account: {
      igUserId: discovered.igUserId,
      username: discovered.username,
      pageId: account.platform_user_id as string,
      pageToken,
    },
  };
}

/**
 * Publish one image or video to Instagram. Requires a public media URL;
 * Instagram does not accept text-only posts.
 */
export async function publishToInstagram(
  input: PublishToInstagramInput,
  db: Db = createServiceClient(),
  pollOpts: Parameters<typeof waitForContainer>[2] = {}
): Promise<PublishResult> {
  if (!isInstagramEnabled()) {
    return { ok: false, error: INSTAGRAM_WAITING_MESSAGE };
  }
  if (!input.mediaUrl) {
    return { ok: false, error: "Instagram posts need a photo or video" };
  }

  const resolved = await getInstagramAccount(
    { projectId: input.projectId, userId: input.userId },
    db
  );
  if (!resolved.connected) {
    return { ok: false, error: resolved.reason };
  }
  const { igUserId, pageToken } = resolved.account;

  try {
    const creationId = await createMediaContainer(igUserId, pageToken, {
      caption: input.caption,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
    });
    if (input.mediaType === "video") {
      await waitForContainer(creationId, pageToken, pollOpts);
    }
    const mediaId = await publishContainer(igUserId, pageToken, creationId);
    const permalink = await fetchPermalink(mediaId, pageToken);
    return { ok: true, externalId: mediaId, permalink };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Instagram publish failed" };
  }
}
