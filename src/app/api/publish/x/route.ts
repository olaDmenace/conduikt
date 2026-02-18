import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function refreshXToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, assetId } = await request.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });
  if (text.length > 280) return NextResponse.json({ error: "Tweet exceeds 280 characters" }, { status: 400 });

  const db = getServiceClient();

  // Get connected X account
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "x")
    .single();

  if (!account) {
    return NextResponse.json({ error: "X account not connected. Connect it in Settings → Integrations." }, { status: 400 });
  }

  let accessToken = account.access_token;

  // Refresh if expired (or within 5 min of expiry)
  if (account.token_expires_at && account.refresh_token) {
    const expiresAt = new Date(account.token_expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const refreshed = await refreshXToken(account.refresh_token);
      if (refreshed) {
        accessToken = refreshed.access_token;
        await db.from("connected_accounts").update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", account.id);
      }
    }
  }

  // Post tweet
  const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!tweetRes.ok) {
    const err = await tweetRes.json();
    const msg = err?.detail ?? err?.errors?.[0]?.message ?? "Failed to post tweet";
    // Token likely expired/revoked — delete account entry so user reconnects
    if (tweetRes.status === 401) {
      await db.from("connected_accounts").delete().eq("id", account.id);
      return NextResponse.json({ error: "X token expired. Please reconnect your account.", reconnect: true }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tweet = await tweetRes.json();
  const tweetId = tweet.data?.id;
  const tweetUrl = tweetId
    ? `https://x.com/${account.platform_username}/status/${tweetId}`
    : null;

  // Update asset status if assetId provided
  if (assetId) {
    await db.from("assets").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_id: tweetId ?? null,
    }).eq("id", assetId);
  }

  return NextResponse.json({ success: true, tweetId, tweetUrl });
}
