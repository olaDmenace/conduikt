import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { encryptToken } from "@/src/lib/crypto/tokens";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) =>
    NextResponse.redirect(`${appUrl}/settings/integrations?error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) return fail(`TikTok auth error: ${errorDescription ?? error}`);
  if (!code || !state) return fail("Missing code or state");

  const storedState = request.cookies.get("tt_oauth_state")?.value;
  const codeVerifier = request.cookies.get("tt_oauth_verifier")?.value;
  if (!storedState || storedState !== state) {
    return fail("Invalid state — please try connecting again");
  }
  if (!codeVerifier) {
    return fail("Missing PKCE verifier — please try connecting again");
  }

  const callbackUrl = `${appUrl}/api/integrations/tiktok/callback`;

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => "");
    console.error("[tiktok/callback] token exchange failed:", tokenRes.status, errText);
    return fail("Failed to exchange code for TikTok access token");
  }

  const tokens = await tokenRes.json();
  const {
    access_token,
    expires_in,
    refresh_token,
    open_id,
    scope,
  }: {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    open_id: string;
    scope: string;
  } = tokens;

  // Fetch the user's basic profile so we can show the connected handle.
  let displayName: string | null = null;
  try {
    const profileRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,union_id",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (profileRes.ok) {
      const profile = await profileRes.json();
      displayName = profile?.data?.user?.display_name ?? null;
    }
  } catch (err) {
    console.warn("[tiktok/callback] profile fetch failed (non-fatal):", err);
  }

  const db = createServiceClient();
  const { error: upsertError } = await db.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "tiktok",
      access_token: encryptToken(access_token),
      refresh_token: encryptToken(refresh_token),
      token_expires_at: expires_in
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null,
      platform_user_id: open_id,
      platform_username: displayName,
      scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  if (upsertError) {
    console.error("[tiktok/callback] upsert failed:", upsertError);
    return fail("Could not save the TikTok connection — please try again");
  }

  const response = NextResponse.redirect(`${appUrl}/settings/integrations?connected=tiktok`);
  response.cookies.delete("tt_oauth_state");
  response.cookies.delete("tt_oauth_verifier");
  return response;
}
