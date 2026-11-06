import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));
vi.mock("@/src/lib/crypto/tokens", () => ({
  decryptToken: <T,>(v: T) => v,
  encryptToken: <T,>(v: T) => v,
  isEncryptionConfigured: () => false,
}));

import {
  fetchAdInsights,
  mapInsightRow,
  syncAdInsights,
  aggregateAds,
  splitAccountId,
  adInsightsSummaryForPrompt,
  META_ADS_WAITING_MESSAGE,
  type RawInsightRow,
} from "./meta-ads";

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

const RAW_A: RawInsightRow = {
  campaign_id: "c1",
  campaign_name: "Spring",
  adset_id: "s1",
  ad_id: "a1",
  ad_name: "Hook A",
  spend: "12.50",
  impressions: "1000",
  clicks: "21",
  ctr: "2.1",
  cpc: "0.595238",
  actions: [
    { action_type: "link_click", value: "21" },
    { action_type: "purchase", value: "2" },
    { action_type: "lead", value: "1" },
  ],
  purchase_roas: [{ action_type: "omni_purchase", value: "3.2" }],
  date_start: "2026-10-20",
  date_stop: "2026-10-20",
};

const RAW_B: RawInsightRow = {
  campaign_id: "c1",
  campaign_name: "Spring",
  adset_id: "s1",
  ad_id: "a2",
  ad_name: "Hook B",
  spend: "30",
  impressions: "5000",
  clicks: "30",
  ctr: "0.6",
  cpc: "1",
  date_start: "2026-10-20",
  date_stop: "2026-10-20",
};

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION;

describe("meta-ads", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = "true";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_FLAG === undefined) delete process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION;
    else process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = ORIGINAL_FLAG;
  });

  it("splitAccountId handles both forms", () => {
    expect(splitAccountId("act_123")).toEqual({ bare: "123", act: "act_123" });
    expect(splitAccountId("123")).toEqual({ bare: "123", act: "act_123" });
  });

  it("mapInsightRow maps numbers, conversions and roas", () => {
    const row = mapInsightRow(RAW_A, "proj1", "act_999", "2026-10-26T00:00:00.000Z");
    expect(row).toMatchObject({
      project_id: "proj1",
      platform: "meta",
      account_id: "999",
      campaign_id: "c1",
      campaign_name: "Spring",
      adset_id: "s1",
      ad_id: "a1",
      ad_name: "Hook A",
      date: "2026-10-20",
      spend: 12.5,
      impressions: 1000,
      clicks: 21,
      ctr: 2.1,
      cpc: 0.595238,
      conversions: 3,
      roas: 3.2,
      synced_at: "2026-10-26T00:00:00.000Z",
    });
    expect(row?.raw).toBe(RAW_A);

    const noActions = mapInsightRow(RAW_B, "proj1", "999");
    expect(noActions?.conversions).toBeNull();
    expect(noActions?.roas).toBeNull();

    expect(mapInsightRow({ ad_name: "no id" }, "proj1", "999")).toBeNull();
  });

  it("fetchAdInsights follows paging.next until the data runs out", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ data: [RAW_A], paging: { cursors: { after: "x" }, next: "https://graph.facebook.com/v21.0/act_999/insights?after=x" } })
      )
      .mockResolvedValueOnce(json({ data: [RAW_B], paging: { cursors: { after: "y" } } }));

    const rows = await fetchAdInsights("999", "tok", { since: "2026-10-20", until: "2026-10-26" });
    expect(rows.map((r) => r.ad_id)).toEqual(["a1", "a2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const first = new URL(String(fetchMock.mock.calls[0][0]));
    expect(first.pathname).toBe("/v21.0/act_999/insights");
    expect(first.searchParams.get("level")).toBe("ad");
    expect(first.searchParams.get("time_increment")).toBe("1");
    expect(first.searchParams.get("fields")).toContain("purchase_roas");
    expect(JSON.parse(first.searchParams.get("time_range")!)).toEqual({ since: "2026-10-20", until: "2026-10-26" });
    expect(String(fetchMock.mock.calls[1][0])).toContain("after=x");
  });

  it("fetchAdInsights surfaces Meta's error message", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: "Invalid OAuth access token" } }, false, 400));
    await expect(
      fetchAdInsights("999", "tok", { since: "2026-10-20", until: "2026-10-26" })
    ).rejects.toThrow("Invalid OAuth access token");
  });

  it("syncAdInsights upserts mapped rows on the unique key", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [RAW_A, RAW_B] }));

    const upsert = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const db = {
      from: (table: string) => {
        if (table === "connected_accounts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "conn1",
                      access_token: "tok",
                      platform_user_id: "999",
                      platform_username: "Shop Ads",
                      metadata: { ad_account_id: "999" },
                    },
                  }),
                }),
              }),
            }),
            update,
          };
        }
        if (table === "ad_insights") return { upsert };
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as Parameters<typeof syncAdInsights>[1];

    const result = await syncAdInsights("proj1", db, { now: new Date("2026-10-26T12:00:00Z") });
    expect(result).toEqual({ ok: true, upserted: 2 });

    expect(upsert).toHaveBeenCalledTimes(1);
    const [rows, opts] = upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: "project_id,platform,ad_id,date", ignoreDuplicates: false });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ project_id: "proj1", ad_id: "a1", date: "2026-10-20", conversions: 3 });
    expect(rows[1]).toMatchObject({ ad_id: "a2", conversions: null });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(JSON.parse(url.searchParams.get("time_range")!)).toEqual({ since: "2026-10-20", until: "2026-10-26" });
    expect(update).toHaveBeenCalled();
  });

  it("syncAdInsights is inert without the flag or without a connection", async () => {
    process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = "false";
    const dbNever = { from: vi.fn() } as unknown as NonNullable<Parameters<typeof syncAdInsights>[1]>;
    expect(await syncAdInsights("proj1", dbNever)).toEqual({ ok: false, upserted: 0, reason: META_ADS_WAITING_MESSAGE });
    expect(dbNever.from).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION = "true";
    const dbEmpty = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      }),
    } as unknown as Parameters<typeof syncAdInsights>[1];
    const r = await syncAdInsights("proj1", dbEmpty);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not connected/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aggregateAds sums daily rows per ad and recomputes click rate", () => {
    const ads = aggregateAds([
      { ad_id: "a1", ad_name: "Hook A", campaign_name: "Spring", spend: "10", impressions: 1000, clicks: 20, conversions: 1, synced_at: "t" },
      { ad_id: "a1", ad_name: "Hook A", campaign_name: "Spring", spend: 5, impressions: 500, clicks: 25, conversions: 2, synced_at: "t" },
      { ad_id: "a2", ad_name: "Hook B", campaign_name: "Spring", spend: 30, impressions: 5000, clicks: 30, conversions: null, synced_at: "t" },
    ]);
    const a1 = ads.find((a) => a.adId === "a1")!;
    expect(a1).toMatchObject({ spend: 15, impressions: 1500, clicks: 45, ctr: 3, cpc: 0.33, conversions: 3 });
    const a2 = ads.find((a) => a.adId === "a2")!;
    expect(a2).toMatchObject({ ctr: 0.6, conversions: null });
  });

  it("adInsightsSummaryForPrompt writes a short block from stored rows", async () => {
    const db = {
      from: (table: string) => {
        if (table === "connected_accounts") {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { platform_username: "Shop Ads" } }) }) }),
            }),
          };
        }
        if (table === "ad_insights") {
          const rows = [
            { ad_id: "a1", ad_name: "Hook A", campaign_name: "Spring", spend: 12.5, impressions: 1000, clicks: 21, conversions: 3, synced_at: "2026-10-26T00:00:00Z" },
            { ad_id: "a2", ad_name: "Hook B", campaign_name: "Spring", spend: 30, impressions: 5000, clicks: 30, conversions: null, synced_at: "2026-10-26T00:00:00Z" },
          ];
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ gte: () => ({ order: () => ({ limit: async () => ({ data: rows }) }) }) }) }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as Parameters<typeof adInsightsSummaryForPrompt>[0];

    const text = await adInsightsSummaryForPrompt(db, "proj1");
    expect(text).toContain("### Paid ads, last 7 days");
    expect(text).toContain("Spend 42.50");
    expect(text).toContain('"Hook A" (Spring): 2.1% click rate, 21 clicks');
    expect(text).toContain("3 results");
    // Top ads come first (Hook A has the higher click rate).
    expect(text.indexOf("Hook A")).toBeLessThan(text.indexOf("Hook B"));
  });
});
