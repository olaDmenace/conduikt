import { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/src/lib/crypto/tokens";

// Shared Google OAuth helpers for the GA4, GSC and YouTube connections.
//
// Tokens in connected_accounts are stored with encryptToken (AES-256-GCM,
// "v1:" prefix), the same as the X / LinkedIn / TikTok rows. Rows written
// before 2026-10-26 are plaintext: readStoredToken() tolerates them (and a
// malformed ciphertext) by falling back to the raw value once, and the next
// refresh re-writes both tokens encrypted, so legacy rows migrate themselves.

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  /** Google occasionally rotates the refresh token on refresh. */
  refresh_token?: string;
}

export interface GoogleAccountTokens {
  id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

/**
 * Decrypt a stored token. Plaintext (legacy) values come back unchanged;
 * a value that looks encrypted but cannot be decrypted is returned raw so a
 * single bad row cannot take the whole integration down — the next refresh
 * overwrites it.
 */
export function readStoredToken<T extends string | null | undefined>(value: T): T {
  if (!value) return value;
  try {
    return decryptToken(value);
  } catch (err) {
    console.warn(
      "[google-oauth] stored token could not be decrypted; using raw value until next refresh",
      err instanceof Error ? err.message : err
    );
    return value;
  }
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<TokenResponse | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Return a usable (decrypted) access token for the row, refreshing it with
 * Google when it is within 5 minutes of expiry. Every write goes through
 * encryptToken, so a plaintext legacy row becomes encrypted on its first
 * refresh.
 */
export async function getValidGoogleToken(
  account: GoogleAccountTokens,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  const accessToken = readStoredToken(account.access_token);
  const refreshToken = readStoredToken(account.refresh_token);

  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at).getTime();
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return accessToken;
    }
  }

  if (!refreshToken) return null;

  const refreshed = await refreshGoogleToken(refreshToken);
  if (!refreshed) return null;

  const nextRefreshToken = refreshed.refresh_token ?? refreshToken;

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      access_token: encryptToken(refreshed.access_token),
      // Re-written on every refresh so legacy plaintext rows get encrypted.
      refresh_token: encryptToken(nextRefreshToken),
      token_expires_at: new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  return refreshed.access_token;
}
