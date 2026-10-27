import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/src/lib/supabase/service";
import { decryptToken } from "@/src/lib/crypto/tokens";

// Meta Ads, read-only (audit 2026-10-24 §5.6).
//
// Scope is ads_read only. We never create, edit, pause or budget an ad.
// The connection is a per-project connected_accounts row with
// platform = 'meta_ads'; the chosen ad account lives in
// metadata.ad_account_id (and platform_user_id for quick lookups).
//
// The same Meta app (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) and the same
// NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION flag gate it, because ads_read
// also needs Meta's business verification.

export const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export const META_ADS_WAITING_MESSAGE =
  "Ad insights are waiting on Meta's business verification";

export const INSIGHT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "ad_id",
  "ad_name",
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "actions",
  "purchase_roas",
].join(",");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export function isMetaAdsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION === "true";
}

export function isMetaAppConfigured(): boolean {
  return !!process.env.FACEBOOK_APP_ID && !!process.env.FACEBOOK_APP_SECRET;
}

/** One ad, one day, as Meta returns it with level=ad and time_increment=1. */
export interface RawInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  actions?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
  date_start?: string;
  date_stop?: string;
}

export interface AdInsightRow {
  project_id: string;
  platform: "meta";
  account_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  ad_id: string;
  ad_name: string | null;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number | null;
  roas: number | null;
  raw: RawInsightRow;
  synced_at: string;
}

export interface AdAccount {
  id: string; // "act_123"
  account_id: string; // "123"
  name: string;
  currency: string | null;
  account_status: number | null;
}

const CONVERSION_ACTION_TYPES = new Set([
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "complete_registration",
  "onsite_conversion.messaging_conversation_started_7d",
]);

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Normalise "act_123" or "123" to the bare id, and to the act_ form. */
export function splitAccountId(id: string): { bare: string; act: string } {
  const bare = id.startsWith("act_") ? id.slice(4) : id;
  return { bare, act: `act_${bare}` };
}

/**
 * Map one raw insight row to an ad_insights row. Conversions sum the
 * action types we count as a result (purchases, leads, registrations,
 * started conversations). ROAS reads purchase_roas when Meta provides it.
 */
export function mapInsightRow(
  raw: RawInsightRow,
  projectId: string,
  accountId: string,
  syncedAt = new Date().toISOString()
): AdInsightRow | null {
  if (!raw.ad_id || !raw.date_start) return null;

  let conversions: number | null = null;
  if (Array.isArray(raw.actions)) {
    const total = raw.actions
      .filter((a) => CONVERSION_ACTION_TYPES.has(a.action_type))
      .reduce((sum, a) => sum + num(a.value), 0);
    conversions = raw.actions.length > 0 ? Math.round(total) : null;
  }

  let roas: number | null = null;
  if (Array.isArray(raw.purchase_roas) && raw.purchase_roas.length > 0) {
    roas = num(raw.purchase_roas[0]?.value);
  }

  return {
    project_id: projectId,
    platform: "meta",
    account_id: splitAccountId(accountId).bare,
    campaign_id: raw.campaign_id ?? null,
    campaign_name: raw.campaign_name ?? null,
    adset_id: raw.adset_id ?? null,
    ad_id: raw.ad_id,
    ad_name: raw.ad_name ?? null,
    date: raw.date_start,
    spend: num(raw.spend),
    impressions: Math.round(num(raw.impressions)),
    clicks: Math.round(num(raw.clicks)),
    ctr: num(raw.ctr),
    cpc: num(raw.cpc),
    conversions,
    roas,
    raw,
    synced_at: syncedAt,
  };
}

async function graphError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return body?.error?.message ?? `${fallback} (${res.status})`;
}

/** List the ad accounts the token can read. */
export async function fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
  const params = new URLSearchParams({
    fields: "id,account_id,name,currency,account_status",
    limit: "50",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me/adaccounts?${params}`);
  if (!res.ok) throw new Error(await graphError(res, "Could not list ad accounts"));
  const data = (await res.json()) as { data?: AdAccount[] };
  return (data.data ?? []).map((a) => ({
    id: a.id,
    account_id: a.account_id ?? splitAccountId(a.id).bare,
    name: a.name ?? a.id,
    currency: a.currency ?? null,
    account_status: a.account_status ?? null,
  }));
}

/**
 * Pull daily, per-ad insights for a date range, following Meta's cursor
 * paging (`paging.next`) until the data runs out. Dates are YYYY-MM-DD.
 */
export async function fetchAdInsights(
  accountId: string,
  accessToken: string,
  range: { since: string; until: string },
  opts: { maxPages?: number } = {}
): Promise<RawInsightRow[]> {
  const maxPages = opts.maxPages ?? 20;
  const { act } = splitAccountId(accountId);
  const params = new URLSearchParams({
    level: "ad",
    fields: INSIGHT_FIELDS,
    time_range: JSON.stringify(range),
    time_increment: "1",
    limit: "500",
    access_token: accessToken,
  });

  let url: string | null = `${GRAPH_BASE}/${act}/insights?${params}`;
  const rows: RawInsightRow[] = [];
  let pages = 0;

  while (url && pages < maxPages) {
    const res: Response = await fetch(url);
    if (!res.ok) throw new Error(await graphError(res, "Could not read ad insights"));
    const body = (await res.json()) as {
      data?: RawInsightRow[];
      paging?: { next?: string };
    };
    rows.push(...(body.data ?? []));
    url = body.paging?.next ?? null;
    pages++;
  }

  return rows;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface MetaAdsConnection {
  id: string;
  accountId: string;
  accountName: string | null;
  accessToken: string;
}

/** The project's meta_ads connection, token decrypted, or null. */
export async function getMetaAdsConnection(
  db: Db,
  projectId: string
): Promise<MetaAdsConnection | null> {
  const { data } = await db
    .from("connected_accounts")
    .select("id, access_token, platform_user_id, platform_username, metadata")
    .eq("project_id", projectId)
    .eq("platform", "meta_ads")
    .maybeSingle();
  if (!data?.access_token) return null;
  const meta = (data.metadata ?? {}) as { ad_account_id?: string };
  const accountId = meta.ad_account_id ?? (data.platform_user_id as string | null);
  if (!accountId) return null;
  let accessToken: string;
  try {
    accessToken = decryptToken(data.access_token as string);
  } catch {
    return null;
  }
  return {
    id: data.id as string,
    accountId,
    accountName: (data.platform_username as string | null) ?? null,
    accessToken,
  };
}

export interface SyncResult {
  ok: boolean;
  upserted: number;
  reason?: string;
}

/**
 * Sync the last `days` days (default 7) of per-ad daily insights into
 * ad_insights. Safe to call without a connection: it returns
 * { ok: false, reason } and touches nothing.
 */
export async function syncAdInsights(
  projectId: string,
  db: Db = createServiceClient(),
  opts: { days?: number; now?: Date } = {}
): Promise<SyncResult> {
  if (!isMetaAdsEnabled()) {
    return { ok: false, upserted: 0, reason: META_ADS_WAITING_MESSAGE };
  }
  const conn = await getMetaAdsConnection(db, projectId);
  if (!conn) {
    return { ok: false, upserted: 0, reason: "Meta Ads is not connected for this project" };
  }

  const days = opts.days ?? 7;
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - (days - 1) * 86_400_000);
  const range = { since: isoDate(since), until: isoDate(now) };

  const raw = await fetchAdInsights(conn.accountId, conn.accessToken, range);
  const syncedAt = now.toISOString();
  const rows = raw
    .map((r) => mapInsightRow(r, projectId, conn.accountId, syncedAt))
    .filter((r): r is AdInsightRow => r !== null);

  if (rows.length === 0) return { ok: true, upserted: 0 };

  // Upsert in chunks so a big account does not make one giant statement.
  const CHUNK = 200;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await db
      .from("ad_insights")
      .upsert(chunk, { onConflict: "project_id,platform,ad_id,date", ignoreDuplicates: false });
    if (error) throw new Error(`ad_insights upsert failed: ${error.message}`);
    upserted += chunk.length;
  }

  await db
    .from("connected_accounts")
    .update({ updated_at: syncedAt })
    .eq("id", conn.id);

  return { ok: true, upserted };
}

// ---------------------------------------------------------------------------
// Summaries (read from ad_insights only; no live calls)
// ---------------------------------------------------------------------------

export interface AdSummaryAd {
  adId: string;
  adName: string | null;
  campaignName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number; // percent, e.g. 2.1
  cpc: number;
  conversions: number | null;
}

export interface AdInsightsSummary {
  connected: boolean;
  days: number;
  accountName: string | null;
  lastSyncedAt: string | null;
  totals: { spend: number; impressions: number; clicks: number; ctr: number; conversions: number };
  topAds: AdSummaryAd[];
  worstAds: AdSummaryAd[];
}

interface StoredRow {
  ad_id: string;
  ad_name: string | null;
  campaign_name: string | null;
  spend: number | string;
  impressions: number;
  clicks: number;
  conversions: number | null;
  synced_at: string;
}

/** Group daily rows by ad and compute totals + a CTR per ad. */
export function aggregateAds(rows: StoredRow[]): AdSummaryAd[] {
  const byAd = new Map<string, AdSummaryAd>();
  for (const r of rows) {
    const cur = byAd.get(r.ad_id) ?? {
      adId: r.ad_id,
      adName: r.ad_name,
      campaignName: r.campaign_name,
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversions: null,
    };
    cur.spend += num(r.spend);
    cur.impressions += r.impressions ?? 0;
    cur.clicks += r.clicks ?? 0;
    if (r.conversions !== null && r.conversions !== undefined) {
      cur.conversions = (cur.conversions ?? 0) + r.conversions;
    }
    byAd.set(r.ad_id, cur);
  }
  for (const ad of byAd.values()) {
    ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
    ad.cpc = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
    ad.spend = Math.round(ad.spend * 100) / 100;
    ad.ctr = Math.round(ad.ctr * 100) / 100;
    ad.cpc = Math.round(ad.cpc * 100) / 100;
  }
  return Array.from(byAd.values());
}

export async function getAdInsightsSummary(
  db: Db,
  projectId: string,
  days = 7
): Promise<AdInsightsSummary> {
  const empty: AdInsightsSummary = {
    connected: false,
    days,
    accountName: null,
    lastSyncedAt: null,
    totals: { spend: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0 },
    topAds: [],
    worstAds: [],
  };

  const { data: conn } = await db
    .from("connected_accounts")
    .select("platform_username")
    .eq("project_id", projectId)
    .eq("platform", "meta_ads")
    .maybeSingle();
  if (!conn) return empty;

  const since = isoDate(new Date(Date.now() - (days - 1) * 86_400_000));
  const { data: rows } = await db
    .from("ad_insights")
    .select("ad_id, ad_name, campaign_name, spend, impressions, clicks, conversions, synced_at")
    .eq("project_id", projectId)
    .eq("platform", "meta")
    .gte("date", since)
    .order("date", { ascending: false })
    .limit(5000);

  const ads = aggregateAds((rows ?? []) as StoredRow[]);
  const totals = ads.reduce(
    (t, a) => ({
      spend: t.spend + a.spend,
      impressions: t.impressions + a.impressions,
      clicks: t.clicks + a.clicks,
      ctr: 0,
      conversions: t.conversions + (a.conversions ?? 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0 }
  );
  totals.ctr =
    totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10_000) / 100 : 0;
  totals.spend = Math.round(totals.spend * 100) / 100;

  // Only ads with enough impressions to make CTR meaningful.
  const ranked = ads.filter((a) => a.impressions >= 100).sort((a, b) => b.ctr - a.ctr);
  const lastSyncedAt =
    (rows ?? []).reduce<string | null>(
      (max, r) => (!max || (r as StoredRow).synced_at > max ? (r as StoredRow).synced_at : max),
      null
    ) ?? null;

  return {
    connected: true,
    days,
    accountName: (conn.platform_username as string | null) ?? null,
    lastSyncedAt,
    totals,
    topAds: ranked.slice(0, 5),
    worstAds: ranked.length > 5 ? ranked.slice(-3).reverse() : [],
  };
}

/**
 * Short plain-text block for the generation prompts: which hooks earned
 * clicks, what was spent, which ads to stop copying. Empty string when
 * there is nothing to say, so callers can append it unconditionally.
 */
export async function adInsightsSummaryForPrompt(
  db: Db,
  projectId: string
): Promise<string> {
  let summary: AdInsightsSummary;
  try {
    summary = await getAdInsightsSummary(db, projectId, 7);
  } catch {
    return "";
  }
  if (!summary.connected || summary.topAds.length === 0) return "";

  const lines: string[] = [];
  lines.push("### Paid ads, last 7 days (Meta, read-only)");
  lines.push(
    `- Spend ${summary.totals.spend.toFixed(2)}, ${summary.totals.impressions.toLocaleString()} impressions, ${summary.totals.clicks.toLocaleString()} clicks, ${summary.totals.ctr}% click rate overall`
  );
  lines.push("- Hooks that earned the most clicks per view:");
  for (const ad of summary.topAds) {
    lines.push(
      `  - "${ad.adName ?? ad.adId}"${ad.campaignName ? ` (${ad.campaignName})` : ""}: ${ad.ctr}% click rate, ${ad.clicks} clicks, spend ${ad.spend.toFixed(2)}${
        ad.conversions ? `, ${ad.conversions} results` : ""
      }`
    );
  }
  if (summary.worstAds.length > 0) {
    lines.push("- Weakest, do not repeat these angles:");
    for (const ad of summary.worstAds) {
      lines.push(`  - "${ad.adName ?? ad.adId}": ${ad.ctr}% click rate on ${ad.impressions} views`);
    }
  }
  return lines.join("\n");
}
