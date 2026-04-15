import { createServiceClient } from "@/src/lib/supabase/service";

interface RefreshResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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
 * Calls the X OAuth2 token endpoint to exchange a refresh token for
 * a fresh access token + new refresh token (single-use rotation).
 */
async function callXRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    if (process.env.NODE_ENV !== "production") {
      const body = await res.text().catch(() => "");
      console.error("[x-token] refresh failed", res.status, body);
    }
    return null;
  }
  return res.json();
}

/**
 * Returns true if the token expires within `bufferMs` (default 5 min).
 */
export function isTokenExpiringSoon(
  expiresAt: string | null,
  bufferMs = 5 * 60 * 1000
): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime() - bufferMs;
}

/**
 * Ensures the given X account has a valid access token.
 *
 * X (OAuth 2.0 PKCE) rotates refresh tokens on every use — the old refresh
 * token is burned the instant the new pair is minted. That makes this
 * function race-prone in two ways we have to defend against:
 *
 *  1) **Cron loop double-refresh.** The scheduled-posts publisher joins
 *     `connected_accounts` and iterates. If one user has multiple pending
 *     posts, the loop holds N copies of the same (stale) row. Naively
 *     refreshing on every iteration burns the refresh token on iteration 1
 *     and nukes the account on iteration 2.
 *
 *  2) **Concurrent worker race.** The Inngest refresher, the cron publisher,
 *     and a live user publish can all touch the same account within the
 *     same few seconds. Only one of them can win the refresh call at X's
 *     end; the losers must NOT delete the account row.
 *
 * The strategy:
 *  - Re-fetch the row from the DB at the start of every call. The caller's
 *    in-memory `account` object may be stale. This alone fixes case (1)
 *    because iteration 2 sees the already-rotated token and returns early.
 *  - On refresh failure, re-fetch once more. If the DB's `refresh_token`
 *    changed since our attempt, another process won the race — we return
 *    its fresh access token instead of deleting. This handles case (2).
 *  - Only delete the account when the token is genuinely dead (refresh
 *    failed AND no concurrent refresh succeeded in the meantime).
 *
 * Returns the valid access token, or `null` if the account is genuinely
 * unrecoverable. When it's unrecoverable, the row is deleted and the
 * optional `onRefreshFailed` hook fires so the caller can notify the user.
 */
export async function ensureValidXToken(
  account: TokenAccount,
  opts?: { onRefreshFailed?: (account: TokenAccount) => Promise<void> }
): Promise<string | null> {
  const db = createServiceClient();

  // (1) Always re-read the latest row by id. Never trust the caller's copy
  //     — it may have been refreshed by a different worker already.
  const { data: current } = await db
    .from("connected_accounts")
    .select(
      "id, user_id, access_token, refresh_token, token_expires_at, platform_username"
    )
    .eq("id", account.id)
    .maybeSingle();

  if (!current) {
    // Account was deleted out from under us (e.g. a prior hard failure).
    return null;
  }

  if (!isTokenExpiringSoon(current.token_expires_at)) {
    return current.access_token;
  }

  if (!current.refresh_token) {
    return null;
  }

  // Snapshot the refresh_token we're about to burn. We'll compare against
  // this value in the failure branch to detect concurrent refreshes.
  const attemptedRefreshToken = current.refresh_token;

  const refreshed = await callXRefresh(attemptedRefreshToken);

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

  // (2) Refresh failed. Before deleting, check whether another worker
  //     already rotated the tokens between our read and our failed call.
  //     If the DB's refresh_token has changed, that means a concurrent
  //     refresh succeeded — our 400/401 from X was just "token already
  //     used" — and we should return its new access token.
  const { data: recheck } = await db
    .from("connected_accounts")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("id", current.id)
    .maybeSingle();

  if (
    recheck &&
    recheck.refresh_token &&
    recheck.refresh_token !== attemptedRefreshToken &&
    !isTokenExpiringSoon(recheck.token_expires_at)
  ) {
    console.log(
      `[x-token] recovered from refresh race on account ${current.id} — another worker rotated tokens`
    );
    return recheck.access_token;
  }

  // Genuinely revoked or permanently invalid. Clean up and notify.
  console.warn(
    `[x-token] refresh irrecoverable for account ${current.id} — deleting connection`
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
