import { SupabaseClient } from "@supabase/supabase-js";
import {
  getValidGoogleToken,
  refreshGoogleToken,
  type GoogleAccountTokens,
} from "@/src/lib/integrations/google-oauth";

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

// GSC shares the Google OAuth app with GA4 and YouTube, so token handling
// (decrypt on read, refresh, encrypt on write) lives in google-oauth.ts.
// These two are kept as names for the existing call sites.
export const refreshGscToken = refreshGoogleToken;

export async function getValidGscToken(
  account: GoogleAccountTokens,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  return getValidGoogleToken(account, supabaseAdmin);
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
