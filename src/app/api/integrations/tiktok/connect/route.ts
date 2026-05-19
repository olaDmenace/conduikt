import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import crypto from "crypto";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Scopes:
//   user.info.basic  → display name + avatar (required to identify connection)
//   video.upload     → upload to user's TikTok inbox (drafts). No audit needed.
//
// We intentionally do NOT request video.publish yet — that scope requires
// TikTok's Content Posting API audit. Once the audit clears we'll widen the
// scope list and reconnect-prompt existing users.
const TIKTOK_SCOPES = ["user.info.basic", "video.upload"].join(",");

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("TikTok is not configured. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.")}`
    );
  }

  const state = base64url(crypto.randomBytes(16));
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/integrations/tiktok/callback`;

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: "code",
    scope: TIKTOK_SCOPES,
    redirect_uri: callbackUrl,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 900,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("tt_oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    maxAge: 900,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
