import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";

function getServiceClient() {
  return createServiceClient();
}

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

  if (error) return fail(`LinkedIn auth error: ${error}`);
  if (!code || !state) return fail("Missing code or state");

  const storedState = request.cookies.get("li_oauth_state")?.value;
  if (!storedState || storedState !== state) return fail("Invalid state — please try again");

  const callbackUrl = `${appUrl}/api/integrations/linkedin/callback`;

  // Exchange code for access token
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("LinkedIn token exchange failed:", err);
    return fail("Failed to exchange code for token");
  }

  const tokens = await tokenRes.json();
  const { access_token, expires_in, refresh_token, refresh_token_expires_in } = tokens;

  // Fetch LinkedIn profile via OpenID userinfo endpoint
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : null;

  const db = getServiceClient();
  await db.from("connected_accounts").upsert({
    user_id: user.id,
    platform: "linkedin",
    access_token,
    refresh_token: refresh_token ?? null,
    token_expires_at: expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null,
    platform_user_id: profile?.sub ?? null,
    platform_username: profile?.name ?? profile?.email ?? null,
    scope: "openid profile email w_member_social",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  const response = NextResponse.redirect(`${appUrl}/settings/integrations?connected=linkedin`);
  response.cookies.delete("li_oauth_state");
  return response;
}
