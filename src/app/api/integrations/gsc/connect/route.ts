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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Google Search Console is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.")}`
    );
  }

  // Per-project scoping: require ?project_id= and verify the user owns it.
  // Without a project_id we'd save the connection at user level, breaking
  // the per-project model for agency accounts juggling multiple sites.
  const projectId = new URL(request.url).searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Connect GSC from inside a project's Analytics tab.")}`
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
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Project not found.")}`
    );
  }

  const state = base64url(crypto.randomBytes(16));
  const callbackUrl = `${appUrl}/api/integrations/gsc/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  const response = NextResponse.redirect(authUrl);
  const cookieOpts = { httpOnly: true, secure: true, maxAge: 900, path: "/" } as const;
  response.cookies.set("gsc_oauth_state", state, cookieOpts);
  // Store project_id alongside state so the callback can attach the
  // connection to the right project. HttpOnly + short TTL.
  response.cookies.set("gsc_oauth_project", projectId, cookieOpts);

  return response;
}
