import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import crypto from "crypto";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("X_CLIENT_ID is not configured. Add it to your environment variables.")}`
    );
  }

  // PKCE
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64url(crypto.randomBytes(16));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/integrations/x/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: callbackUrl,
    scope: "tweet.read tweet.write users.read offline.access media.write",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params}`;

  const response = NextResponse.redirect(authUrl);
  // Store verifier + state in httpOnly cookies (15 min TTL)
  const cookieOpts = { httpOnly: true, secure: true, maxAge: 900, path: "/" } as const;
  response.cookies.set("x_code_verifier", codeVerifier, cookieOpts);
  response.cookies.set("x_oauth_state", state, cookieOpts);

  return response;
}
