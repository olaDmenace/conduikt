import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { encryptToken } from "@/src/lib/crypto/tokens";

// GET /api/integrations/facebook/callback
// Exchanges code → short-lived user token → long-lived user token →
// fetches Pages, stores the first Page's access token as the connected account.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) =>
    NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent(msg)}`
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");

  if (error) return fail(`Facebook auth error: ${error}`);
  if (!code || !state) return fail("Missing code or state");

  const storedState = request.cookies.get("fb_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return fail("Invalid state — please try again");
  }

  const callbackUrl = `${appUrl}/api/integrations/facebook/callback`;

  // 1. Exchange code for short-lived user token
  const shortTokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: callbackUrl,
      code,
    })}`
  );

  if (!shortTokenRes.ok) {
    const err = await shortTokenRes.text();
    console.error("FB token exchange failed:", err);
    return fail("Failed to exchange code for token");
  }

  const shortTokenData = await shortTokenRes.json();
  const shortToken: string = shortTokenData.access_token;

  // 2. Exchange short-lived for long-lived user token (~60 days)
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      fb_exchange_token: shortToken,
    })}`
  );

  if (!longTokenRes.ok) {
    return fail("Failed to obtain long-lived token");
  }

  const longTokenData = await longTokenRes.json();
  const longToken: string = longTokenData.access_token;
  const expiresIn: number | undefined = longTokenData.expires_in;

  // 3. Fetch user's Pages (Page access tokens are non-expiring when derived
  // from a long-lived user token)
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?${new URLSearchParams({
      access_token: longToken,
      fields: "id,name,access_token,category",
    })}`
  );

  if (!pagesRes.ok) {
    return fail("Failed to fetch Pages — make sure you granted pages_show_list");
  }

  const pagesData = await pagesRes.json();
  const pages: Array<{ id: string; name: string; access_token: string }> =
    pagesData.data ?? [];

  if (pages.length === 0) {
    return fail(
      "No Pages found on your Facebook account. You need admin access to at least one Page."
    );
  }

  // Store the first Page — a picker UI can come later if the user has multiple
  const page = pages[0];

  const db = createServiceClient();
  await db.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "facebook",
      access_token: encryptToken(page.access_token),
      refresh_token: encryptToken(longToken), // user token stashed here for re-fetching pages later
      token_expires_at: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null,
      platform_user_id: page.id,
      platform_username: page.name,
      scope: "pages_manage_posts",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  const { retryFailedPostsAfterReconnect } = await import(
    "@/src/lib/integrations/reconnect-helpers"
  );
  const retried = await retryFailedPostsAfterReconnect(
    user.id,
    "facebook",
  ).catch((err) => {
    console.error(
      "[facebook/callback] retryFailedPostsAfterReconnect failed:",
      err,
    );
    return 0;
  });
  if (retried > 0) {
    console.log(
      `[facebook/callback] Re-queued ${retried} previously-failed Facebook posts.`,
    );
  }

  const response = NextResponse.redirect(
    `${appUrl}/settings/integrations?connected=facebook`
  );
  response.cookies.delete("fb_oauth_state");
  return response;
}
