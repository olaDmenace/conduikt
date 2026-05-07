import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

interface Ga4Property {
  name: string; // e.g. "properties/12345"
  displayName: string;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Per-project: recover the project_id from the cookie set by /connect.
  const projectId = request.cookies.get("ga4_oauth_project")?.value;
  if (!projectId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent(
        "Connection context lost. Try connecting again from the project's Analytics tab."
      )}`
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
      `${appUrl}/dashboard?error=${encodeURIComponent("Project not found.")}`
    );
  }
  const projectRedirect = `${appUrl}/projects/${projectId}/analytics`;

  if (error) {
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Google authorisation denied")}`
    );
  }

  const storedState = request.cookies.get("ga4_oauth_state")?.value;
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

  const callbackUrl = `${appUrl}/api/integrations/ga4/callback`;
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
    console.error("GA4 token exchange failed:", msg);
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Failed to exchange Google authorisation code")}`
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Fetch GA4 properties. Admin API v1beta uses accountSummaries endpoint.
  let propertyName: string | null = null;
  let propertyDisplay: string | null = null;
  try {
    const listRes = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (listRes.ok) {
      const data = await listRes.json();
      const firstAccount = (data.accountSummaries ?? [])[0];
      const firstProperty: Ga4Property | undefined =
        firstAccount?.propertySummaries?.[0];
      if (firstProperty) {
        propertyName = firstProperty.name;
        propertyDisplay = firstProperty.displayName;
      }
    }
  } catch {
    // Non-critical — user can pick later
  }

  // Insert-or-update — see GSC callback for why we don't use upsert.
  const payload = {
    user_id: user.id,
    project_id: projectId,
    platform: "ga4" as const,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expires_at: expiresAt,
    platform_user_id: propertyName,
    platform_username: propertyDisplay,
    scope: tokens.scope ?? null,
  };

  const { data: existing } = await supabase
    .from("connected_accounts")
    .select("id")
    .eq("project_id", projectId)
    .eq("platform", "ga4")
    .maybeSingle();

  const { error: writeError } = existing
    ? await supabase
        .from("connected_accounts")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("connected_accounts").insert(payload);

  if (writeError) {
    console.error("GA4 connection write error:", writeError);
    return NextResponse.redirect(
      `${projectRedirect}?error=${encodeURIComponent("Failed to save GA4 connection")}`
    );
  }

  const response = NextResponse.redirect(`${projectRedirect}?connected=ga4`);
  response.cookies.delete("ga4_oauth_state");
  response.cookies.delete("ga4_oauth_project");
  return response;
}
