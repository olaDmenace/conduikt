import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { encryptToken } from "@/src/lib/crypto/tokens";
import {
  fetchAdAccounts,
  isMetaAdsEnabled,
  META_ADS_WAITING_MESSAGE,
} from "@/src/lib/integrations/meta-ads";

// GET /api/integrations/meta-ads/callback
// code -> short-lived token -> long-lived token -> list ad accounts ->
// store the first as the project's 'meta_ads' connection (the accounts
// route lets the user switch). Token is encrypted at rest.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projectId = request.cookies.get("meta_ads_oauth_project")?.value ?? null;
  const backUrl = projectId
    ? `${appUrl}/projects/${projectId}/analytics`
    : `${appUrl}/settings/integrations`;
  const fail = (msg: string) =>
    NextResponse.redirect(`${backUrl}?error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  if (!isMetaAdsEnabled()) return fail(META_ADS_WAITING_MESSAGE);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");

  if (error) return fail(`Meta sign-in error: ${error}`);
  if (!code || !state) return fail("Missing code or state");
  if (!projectId) return fail("The connection lost track of the project. Start again from Analytics.");

  const storedState = request.cookies.get("meta_ads_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return fail("Invalid state. Please try again.");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return fail("Project not found.");

  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return fail("FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are not configured.");
  }

  const callbackUrl = `${appUrl}/api/integrations/meta-ads/callback`;

  const shortRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: callbackUrl,
      code,
    })}`
  );
  if (!shortRes.ok) {
    console.error("[meta-ads/callback] code exchange failed:", await shortRes.text().catch(() => ""));
    return fail("Could not finish signing in with Meta.");
  }
  const shortToken = ((await shortRes.json()) as { access_token?: string }).access_token;
  if (!shortToken) return fail("Meta returned no token.");

  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      fb_exchange_token: shortToken,
    })}`
  );
  if (!longRes.ok) return fail("Could not get a long-lived token from Meta.");
  const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };
  const longToken = longData.access_token ?? shortToken;
  const expiresAt = longData.expires_in
    ? new Date(Date.now() + longData.expires_in * 1000).toISOString()
    : null;

  let accounts: Awaited<ReturnType<typeof fetchAdAccounts>>;
  try {
    accounts = await fetchAdAccounts(longToken);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not list ad accounts.");
  }
  if (accounts.length === 0) {
    return fail("No ad accounts found on this Meta login. You need at least view access to one.");
  }
  const chosen = accounts[0];

  const db = createServiceClient();
  const payload = {
    user_id: user.id,
    project_id: projectId,
    platform: "meta_ads" as const,
    access_token: encryptToken(longToken),
    refresh_token: null,
    token_expires_at: expiresAt,
    platform_user_id: chosen.account_id,
    platform_username: chosen.name,
    scope: "ads_read",
    metadata: {
      ad_account_id: chosen.account_id,
      currency: chosen.currency,
      accounts: accounts.map((a) => ({
        account_id: a.account_id,
        name: a.name,
        currency: a.currency,
      })),
    },
  };

  // Insert-or-update by (project_id, platform); see the GA4 callback for why
  // this is not an upsert.
  const { data: existing } = await db
    .from("connected_accounts")
    .select("id")
    .eq("project_id", projectId)
    .eq("platform", "meta_ads")
    .maybeSingle();

  const { error: writeError } = existing
    ? await db
        .from("connected_accounts")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await db.from("connected_accounts").insert(payload);

  if (writeError) {
    console.error("[meta-ads/callback] write error:", writeError);
    return fail(
      writeError.code === "23505"
        ? "Ad insights are already connected on another of your projects. Disconnect there first."
        : "Could not save the ad insights connection."
    );
  }

  const response = NextResponse.redirect(`${backUrl}?connected=meta_ads`);
  response.cookies.delete("meta_ads_oauth_state");
  response.cookies.delete("meta_ads_oauth_project");
  return response;
}
