import { SupabaseClient } from "@supabase/supabase-js";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
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

export async function getValidGoogleToken(
  account: {
    id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
  },
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at).getTime();
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return account.access_token;
    }
  }

  if (!account.refresh_token) return null;

  const refreshed = await refreshGoogleToken(account.refresh_token);
  if (!refreshed) return null;

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  return refreshed.access_token;
}
