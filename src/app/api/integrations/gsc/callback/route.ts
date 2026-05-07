import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Connections are now per-project; the project_id was stored in a cookie
  // by the connect route before redirecting to Google. Recover it here so
  // we can attach the OAuth result to the right project. If the cookie's
  // missing (replay, expired) we send the user back rather than silently
  // saving a Google row at user-level (which would fail the CHECK).
  const projectId = request.cookies.get("gsc_oauth_project")?.value;
  const projectErrorRedirect = (msg: string) =>
    NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent(msg)}`
    );

  if (!projectId) {
    return projectErrorRedirect(
      "Connection context lost. Try connecting again from the project's Analytics tab."
    );
  }

  // Verify the user still owns the project before writing the row.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) {
    return projectErrorRedirect("Project not found.");
  }
  const projectRedirect = `${appUrl}/projects/${projectId}/analytics`;

  if (error) {
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Google authorisation denied")}`
    );
  }

  // Validate state
  const storedState = request.cookies.get("gsc_oauth_state")?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Invalid OAuth state. Please try again.")}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("No authorisation code received")}`
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Google credentials not configured")}`
    );
  }

  // Exchange code for tokens
  const callbackUrl = `${appUrl}/api/integrations/gsc/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const msg = await tokenRes.text();
    console.error("GSC token exchange failed:", msg);
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Failed to exchange Google authorisation code")}`
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Fetch list of verified GSC sites
  let siteUrl: string | null = null;
  try {
    const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (sitesRes.ok) {
      const sitesData = await sitesRes.json();
      // Pick the first verified site
      const verified = (sitesData.siteEntry ?? []).find(
        (s: { permissionLevel: string }) => s.permissionLevel !== "siteUnverifiedUser"
      );
      siteUrl = verified?.siteUrl ?? sitesData.siteEntry?.[0]?.siteUrl ?? null;
    }
  } catch {
    // Non-critical — user can select site later
  }

  // Upsert into connected_accounts (project-scoped for Google).
  const { error: upsertError } = await supabase
    .from("connected_accounts")
    .upsert(
      {
        user_id: user.id,
        project_id: projectId,
        platform: "gsc",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        platform_user_id: null,
        platform_username: siteUrl, // store primary site as "username" for display
        scope: tokens.scope ?? null,
      },
      { onConflict: "project_id,platform" }
    );

  if (upsertError) {
    console.error("GSC upsert error:", upsertError);
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Failed to save Google connection")}`
    );
  }

  const response = NextResponse.redirect(`${projectRedirect}?connected=gsc`);
  response.cookies.delete("gsc_oauth_state");
  response.cookies.delete("gsc_oauth_project");
  return response;
}
