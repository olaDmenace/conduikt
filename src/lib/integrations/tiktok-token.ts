import { createServiceClient } from "@/src/lib/supabase/service";
import { decryptToken, encryptToken } from "@/src/lib/crypto/tokens";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

interface RefreshResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  scope?: string;
  open_id?: string;
}

interface TokenAccount {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_username: string | null;
}

async function callTikTokRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    if (process.env.NODE_ENV !== "production") {
      const body = await res.text().catch(() => "");
      console.error("[tiktok-token] refresh failed", res.status, body);
    }
    return null;
  }
  return res.json();
}

export function isTikTokTokenExpiringSoon(
  expiresAt: string | null,
  bufferMs = 5 * 60 * 1000
): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime() - bufferMs;
}

/**
 * TikTok OAuth 2.0 rotates refresh tokens on every use — same race-condition
 * surface as X. The strategy mirrors `ensureValidXToken`: re-read the row,
 * try refresh, and on failure re-read once more to detect concurrent refresh
 * before deleting the account.
 */
export async function ensureValidTikTokToken(
  account: TokenAccount,
  opts?: { onRefreshFailed?: (account: TokenAccount) => Promise<void> }
): Promise<string | null> {
  const db = createServiceClient();

  const { data: current } = await db
    .from("connected_accounts")
    .select(
      "id, user_id, access_token, refresh_token, token_expires_at, platform_username"
    )
    .eq("id", account.id)
    .maybeSingle();

  if (!current) return null;

  if (!isTikTokTokenExpiringSoon(current.token_expires_at)) {
    return decryptToken(current.access_token);
  }

  if (!current.refresh_token) return null;

  const attemptedStoredRefreshToken = current.refresh_token;
  const attemptedRefreshToken = decryptToken(current.refresh_token);

  const refreshed = await callTikTokRefresh(attemptedRefreshToken);

  if (refreshed) {
    await db
      .from("connected_accounts")
      .update({
        access_token: encryptToken(refreshed.access_token),
        refresh_token: encryptToken(refreshed.refresh_token),
        token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);
    return refreshed.access_token;
  }

  // Refresh failed — check for concurrent rotation before deleting.
  const { data: recheck } = await db
    .from("connected_accounts")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("id", current.id)
    .maybeSingle();

  if (
    recheck &&
    recheck.refresh_token &&
    recheck.refresh_token !== attemptedStoredRefreshToken &&
    !isTikTokTokenExpiringSoon(recheck.token_expires_at)
  ) {
    console.log(
      `[tiktok-token] recovered from refresh race on account ${current.id} — another worker rotated tokens`
    );
    return decryptToken(recheck.access_token);
  }

  // Refresh irrecoverable — clear tokens but KEEP the row so the OAuth
  // callback can upsert on (user_id, platform) when the user reconnects.
  // Silent deletion silently nuked customer connections. See x-token.ts.
  console.warn(
    `[tiktok-token] refresh irrecoverable for account ${current.id} — marking as needs-reauth`
  );
  await db
    .from("connected_accounts")
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);
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
