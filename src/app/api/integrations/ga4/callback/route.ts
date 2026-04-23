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

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Google authorisation denied")}`
    );
  }

  const storedState = request.cookies.get("ga4_oauth_state")?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Invalid OAuth state. Please try again.")}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("No authorisation code received")}`
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Google credentials not configured")}`
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
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Failed to exchange Google authorisation code")}`
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

  const { error: upsertError } = await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "ga4",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      platform_user_id: propertyName,
      platform_username: propertyDisplay,
      scope: tokens.scope ?? null,
    },
    { onConflict: "user_id,platform" }
  );

  if (upsertError) {
    console.error("GA4 upsert error:", upsertError);
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Failed to save GA4 connection")}`
    );
  }

  const response = NextResponse.redirect(`${appUrl}/settings/integrations?connected=ga4`);
  response.cookies.delete("ga4_oauth_state");
  return response;
}
