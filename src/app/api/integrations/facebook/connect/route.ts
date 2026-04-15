import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import crypto from "crypto";

// GET /api/integrations/facebook/connect
// Redirects user to Facebook OAuth. Requires a Meta app with
// pages_show_list, pages_manage_posts, and pages_read_engagement scopes.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent(
        "FACEBOOK_APP_ID is not configured. Add it to your environment variables."
      )}`
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const callbackUrl = `${appUrl}/api/integrations/facebook/callback`;

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement,public_profile",
    state,
  });

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 900,
    path: "/",
  });
  return response;
}
