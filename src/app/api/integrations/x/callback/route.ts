import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

  if (error) return fail(`X auth error: ${error}`);
  if (!code || !state) return fail("Missing code or state");

  // Validate state
  const storedState = request.cookies.get("x_oauth_state")?.value;
  const codeVerifier = request.cookies.get("x_code_verifier")?.value;
  if (!storedState || storedState !== state) return fail("Invalid state — please try again");
  if (!codeVerifier) return fail("Missing code verifier — please try again");

  const callbackUrl = `${appUrl}/api/integrations/x/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("X token exchange failed:", err);
    return fail("Failed to exchange code for token");
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Fetch X user info
  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=username,name", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const xUser = userRes.ok ? (await userRes.json()).data : null;

  // Upsert connected account (use service role — user's RLS can't upsert on own row easily)
  const db = getServiceClient();
  await db.from("connected_accounts").upsert({
    user_id: user.id,
    platform: "x",
    access_token,
    refresh_token: refresh_token ?? null,
    token_expires_at: expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null,
    platform_user_id: xUser?.id ?? null,
    platform_username: xUser?.username ?? null,
    scope: tokens.scope ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  const response = NextResponse.redirect(`${appUrl}/settings/integrations?connected=x`);
  // Clear PKCE cookies
  response.cookies.delete("x_code_verifier");
  response.cookies.delete("x_oauth_state");
  return response;
}
