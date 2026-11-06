import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";
import { hasMedia, isVideoMedia, type PostMedia } from "@/src/lib/media/types";
import {
  INSTAGRAM_WAITING_MESSAGE,
  isInstagramEnabled,
  publishToInstagram,
} from "@/src/lib/integrations/instagram";

// POST /api/publish/instagram
// Mirrors /api/publish/facebook: signed-in user, their own project, the
// Facebook Page connection's token. Instagram needs media; a text-only
// request is rejected before anything is called.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isInstagramEnabled()) {
    return NextResponse.json({ error: INSTAGRAM_WAITING_MESSAGE }, { status: 503 });
  }

  const { text, assetId, projectId, media } = (await request.json().catch(() => ({}))) as {
    text?: string;
    assetId?: string;
    projectId?: string;
    media?: PostMedia;
  };

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!hasMedia(media) || !media.url) {
    return NextResponse.json(
      { error: "Instagram posts need a photo or video. Attach one before publishing." },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const db = createServiceClient();
  const result = await publishToInstagram(
    {
      projectId,
      userId: user.id,
      caption: text?.trim() ?? "",
      mediaUrl: media.url,
      mediaType: isVideoMedia(media) ? "video" : "image",
    },
    db
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (assetId) {
    await supabase
      .from("assets")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_id: result.externalId,
      })
      .eq("id", assetId);
  }

  dispatchWebhooks(user.id, projectId, {
    event: "post.published",
    title: "Post published to Instagram",
    content: text ?? "",
    contentType: "social_post",
    metadata: { platform: "instagram", externalId: result.externalId, postUrl: result.permalink },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    externalId: result.externalId,
    postUrl: result.permalink,
  });
}
