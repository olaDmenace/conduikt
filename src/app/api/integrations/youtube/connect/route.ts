import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import crypto from "crypto";

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent(
        "YouTube is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables."
      )}`
    );
  }

  const state = base64url(crypto.randomBytes(16));
  const callbackUrl = `${appUrl}/api/integrations/youtube/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("youtube_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 900,
    path: "/",
  });

  return response;
}
