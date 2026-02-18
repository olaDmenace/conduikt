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

  const state = base64url(crypto.randomBytes(16));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/integrations/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: callbackUrl,
    scope: "w_member_social r_liteprofile",
    state,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("li_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 900,
    path: "/",
  });
  return response;
}
