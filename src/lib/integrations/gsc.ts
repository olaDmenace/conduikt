import { SupabaseClient } from "@supabase/supabase-js";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQuery {
  term: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function refreshGscToken(
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

export async function getValidGscToken(
  account: {
    id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
  },
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  // If token isn't expired (with 5 min buffer), return as-is
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at).getTime();
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return account.access_token;
    }
  }

  // Need refresh
  if (!account.refresh_token) return null;

  const refreshed = await refreshGscToken(account.refresh_token);
  if (!refreshed) return null;

  // Update stored token
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

export async function fetchSearchAnalytics(
  siteUrl: string,
  accessToken: string,
  days = 28
): Promise<GscQuery[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ["query"],
        rowLimit: 500,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `GSC API error ${res.status}`);
  }

  const data = await res.json();
  const rows: SearchAnalyticsRow[] = data.rows ?? [];

  return rows.map((row) => ({
    term: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 10000,
    position: Math.round(row.position * 10) / 10,
  }));
}
