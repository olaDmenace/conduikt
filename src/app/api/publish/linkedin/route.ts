import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";
import { uploadMediaToLinkedIn } from "@/src/lib/integrations/media-upload";
import { hasMedia, type PostMedia } from "@/src/lib/media/types";
import { ensureValidLinkedInToken } from "@/src/lib/integrations/linkedin-token";

function getServiceClient() {
  return createServiceClient();
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

  const db = getServiceClient();

  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "linkedin")
    .single();

  if (!account) {
    return NextResponse.json({ error: "LinkedIn account not connected. Connect it in Settings → Integrations." }, { status: 400 });
  }

  // Ensure token is fresh — attempt refresh if expiring soon
  const freshToken = await ensureValidLinkedInToken(account);
  if (!freshToken) {
    return NextResponse.json({ error: "LinkedIn token expired. Please reconnect your account.", reconnect: true }, { status: 401 });
  }

  // Upload media if present
  let imageUrn: string | null = null;
  if (hasMedia(media)) {
    try {
      imageUrn = await uploadMediaToLinkedIn(
        freshToken,
        account.platform_user_id,
        media
      );
    } catch (err) {
      console.error("[publish/linkedin] media upload error:", err);
    }
    if (!imageUrn) {
      return NextResponse.json(
        { error: "Failed to upload media to LinkedIn." },
        { status: 400 }
      );
    }
  }

  // Post to LinkedIn using the REST Posts API
  const postBody: Record<string, unknown> = {
    author: `urn:li:person:${account.platform_user_id}`,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisableForOperator: false,
  };
  if (imageUrn) {
    postBody.content = {
      media: {
        id: imageUrn,
        altText: media?.overlay?.text?.slice(0, 120) ?? "",
      },
    };
  }

  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${freshToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    console.error("LinkedIn post failed:", err);
    return NextResponse.json({ error: "Failed to post to LinkedIn" }, { status: 400 });
  }

  // LinkedIn returns the post ID in the X-RestLi-Id header
  const postId = postRes.headers.get("x-restli-id") ?? null;

  if (assetId) {
    await db.from("assets").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_id: postId,
    }).eq("id", assetId);
  }

  dispatchWebhooks(user.id, projectId ?? null, {
    event: "post.published",
    title: "Post published to LinkedIn",
    content: text,
    contentType: "social_post",
    metadata: { platform: "linkedin", postId },
  }).catch(() => {});

  return NextResponse.json({ success: true, postId });
}
