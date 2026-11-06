import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import {
  isMetaAdsEnabled,
  isMetaAppConfigured,
  META_ADS_WAITING_MESSAGE,
} from "@/src/lib/integrations/meta-ads";

// GET /api/integrations/meta-ads/connect?project_id=...
// Sends the user to Meta's OAuth dialog asking for ads_read only. Per
// project, like the Google sources. Gated by the same flag as Facebook
// because ads_read needs the same business verification.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = `${appUrl}/settings/integrations`;

  if (!isMetaAdsEnabled()) {
    return NextResponse.json({ error: META_ADS_WAITING_MESSAGE }, { status: 503 });
  }

  if (!isMetaAppConfigured()) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(
        "FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are not configured."
      )}`
    );
  }

  const projectId = new URL(request.url).searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Connect ad insights from inside a project's Analytics tab.")}`
    );
  }
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Project not found.")}`
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const callbackUrl = `${appUrl}/api/integrations/meta-ads/callback`;

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "ads_read",
    state,
  });

  const response = NextResponse.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
  const cookieOpts = { httpOnly: true, secure: true, maxAge: 900, path: "/" } as const;
  response.cookies.set("meta_ads_oauth_state", state, cookieOpts);
  response.cookies.set("meta_ads_oauth_project", projectId, cookieOpts);
  return response;
}
