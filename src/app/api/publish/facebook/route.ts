import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";
import { hasMedia, type PostMedia } from "@/src/lib/media/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, assetId, projectId, media } = (await request.json()) as {
    text: string;
    assetId?: string;
    projectId?: string;
    media?: PostMedia;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "facebook")
    .single();

  if (!account) {
    return NextResponse.json(
      {
        error:
          "Facebook Page not connected. Connect it in Settings → Integrations.",
      },
      { status: 400 }
    );
  }

  const pageId = account.platform_user_id;
  const pageToken = account.access_token;

  if (!pageId || !pageToken) {
    return NextResponse.json(
      { error: "Facebook connection is incomplete — reconnect the Page" },
      { status: 400 }
    );
  }

  // When media is present, POST directly to /{page_id}/photos with
  // caption + url. For text-only, POST to /{page_id}/feed.
  let externalId: string | null = null;

  try {
    if (hasMedia(media) && media.url) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: media.url,
            caption: text,
            access_token: pageToken,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: err?.error?.message ?? `Facebook photo post failed (${res.status})` },
          { status: 400 }
        );
      }
      const data = await res.json();
      externalId = data?.post_id ?? data?.id ?? null;
    } else {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            access_token: pageToken,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: err?.error?.message ?? `Facebook feed post failed (${res.status})` },
          { status: 400 }
        );
      }
      const data = await res.json();
      externalId = data?.id ?? null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const postUrl = externalId
    ? `https://www.facebook.com/${externalId}`
    : null;

  if (assetId) {
    await supabase
      .from("assets")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_id: externalId,
      })
      .eq("id", assetId);
  }

  dispatchWebhooks(user.id, projectId ?? null, {
    event: "post.published",
    title: "Post published to Facebook",
    content: text,
    contentType: "social_post",
    metadata: { platform: "facebook", externalId, postUrl },
  }).catch(() => {});

  return NextResponse.json({ success: true, externalId, postUrl });
}
