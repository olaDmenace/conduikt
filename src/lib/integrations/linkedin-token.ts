import { createServiceClient } from "@/src/lib/supabase/service";

interface RefreshResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in?: number;
}

interface TokenAccount {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_username: string | null;
}

/**
 * Calls the LinkedIn OAuth2 token endpoint to exchange a refresh token
 * for a fresh access token + new refresh token.
 *
 * LinkedIn refresh tokens are long-lived (365 days) and are NOT single-use
 * like X's, so the race-condition risk is lower. However we still re-read
 * the DB row before refreshing to avoid unnecessary calls.
 */
async function callLinkedInRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    if (process.env.NODE_ENV !== "production") {
      const body = await res.text().catch(() => "");
      console.error("[linkedin-token] refresh failed", res.status, body);
    }
    return null;
  }
  return res.json();
}

/**
 * Returns true if the token expires within `bufferMs` (default 5 min).
 */
export function isLinkedInTokenExpiringSoon(
  expiresAt: string | null,
  bufferMs = 5 * 60 * 1000
): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime() - bufferMs;
}

/**
 * Ensures the given LinkedIn account has a valid access token.
 *
 * LinkedIn access tokens last ~60 days and refresh tokens last ~365 days.
 * Unlike X, LinkedIn refresh tokens are NOT single-use, so concurrent
 * refresh is safe (both callers get valid new tokens). We still re-read
 * the DB to avoid unnecessary refresh calls.
 *
 * Returns the valid access token, or `null` if unrecoverable.
 */
export async function ensureValidLinkedInToken(
  account: TokenAccount,
  opts?: { onRefreshFailed?: (account: TokenAccount) => Promise<void> }
): Promise<string | null> {
  const db = createServiceClient();

  // Re-read the latest row — caller's copy may be stale.
  const { data: current } = await db
    .from("connected_accounts")
    .select(
      "id, user_id, access_token, refresh_token, token_expires_at, platform_username"
    )
    .eq("id", account.id)
    .maybeSingle();

  if (!current) return null;

  if (!isLinkedInTokenExpiringSoon(current.token_expires_at)) {
    return current.access_token;
  }

  // No refresh token → can't refresh. LinkedIn doesn't always issue one.
  if (!current.refresh_token) {
    // Token is expired and we have no way to refresh — mark as dead.
    if (opts?.onRefreshFailed) {
      await opts.onRefreshFailed({
        id: current.id,
        user_id: current.user_id,
        access_token: current.access_token,
        refresh_token: current.refresh_token,
        token_expires_at: current.token_expires_at,
        platform_username: current.platform_username,
      });
    }
    return null;
  }

  const refreshed = await callLinkedInRefresh(current.refresh_token);

  if (refreshed) {
    await db
      .from("connected_accounts")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);
    return refreshed.access_token;
  }

  // Refresh failed — token is genuinely dead.
  console.warn(
    `[linkedin-token] refresh failed for account ${current.id} — deleting connection`
  );
  await db.from("connected_accounts").delete().eq("id", current.id);
  if (opts?.onRefreshFailed) {
    await opts.onRefreshFailed({
      id: current.id,
      user_id: current.user_id,
      access_token: current.access_token,
      refresh_token: current.refresh_token,
      token_expires_at: current.token_expires_at,
      platform_username: current.platform_username,
    });
  }

  return null;
}
