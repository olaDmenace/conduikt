import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

interface YoutubeChannel {
  id: string;
  snippet: { title: string };
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

  const storedState = request.cookies.get("youtube_oauth_state")?.value;
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

  const callbackUrl = `${appUrl}/api/integrations/youtube/callback`;
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
    console.error("YouTube token exchange failed:", msg);
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Failed to exchange Google authorisation code")}`
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Fetch the user's YouTube channel
  let channelId: string | null = null;
  let channelTitle: string | null = null;
  try {
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (channelRes.ok) {
      const data = await channelRes.json();
      const first: YoutubeChannel | undefined = data.items?.[0];
      if (first) {
        channelId = first.id;
        channelTitle = first.snippet.title;
      }
    }
  } catch {
    // Non-critical
  }

  const { error: upsertError } = await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "youtube",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      platform_user_id: channelId,
      platform_username: channelTitle,
      scope: tokens.scope ?? null,
    },
    { onConflict: "user_id,platform" }
  );

  if (upsertError) {
    console.error("YouTube upsert error:", upsertError);
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent("Failed to save YouTube connection")}`
    );
  }

  const response = NextResponse.redirect(
    `${appUrl}/settings/integrations?connected=youtube`
  );
  response.cookies.delete("youtube_oauth_state");
  return response;
}
