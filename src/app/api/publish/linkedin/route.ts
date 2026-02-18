import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, assetId } = await request.json();
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

  // Check token expiry
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at).getTime();
    if (Date.now() > expiresAt) {
      await db.from("connected_accounts").delete().eq("id", account.id);
      return NextResponse.json({ error: "LinkedIn token expired. Please reconnect your account.", reconnect: true }, { status: 401 });
    }
  }

  // Post to LinkedIn using the REST Posts API
  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
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
    }),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    console.error("LinkedIn post failed:", err);
    if (postRes.status === 401) {
      await db.from("connected_accounts").delete().eq("id", account.id);
      return NextResponse.json({ error: "LinkedIn token expired. Please reconnect your account.", reconnect: true }, { status: 401 });
    }
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

  return NextResponse.json({ success: true, postId });
}
