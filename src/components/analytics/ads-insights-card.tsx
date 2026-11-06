"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";

// Paid ads card for the Analytics page. Reads
// /api/integrations/meta-ads/summary, which only reads the ad_insights
// table (the six-hourly sync fills it). Standalone; not wired in yet.

interface AdSummaryAd {
  adId: string;
  adName: string | null;
  campaignName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number | null;
}

interface AdsSummary {
  connected: boolean;
  reason?: string;
  days: number;
  accountName: string | null;
  lastSyncedAt: string | null;
  totals: { spend: number; impressions: number; clicks: number; ctr: number; conversions: number };
  topAds: AdSummaryAd[];
  worstAds: AdSummaryAd[];
}

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdsInsightsCard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AdsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/integrations/meta-ads/summary?projectId=${encodeURIComponent(projectId)}&days=7`
        );
        const body = (await res.json().catch(() => ({}))) as AdsSummary & { error?: string };
        if (!res.ok) throw new Error(body.error || `Could not load ad results (${res.status})`);
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load ad results");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading ad results">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line rail:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 bg-surface p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Megaphone className="h-6 w-6" />}
        title={`We couldn't load your ad results: ${error}.`}
      />
    );
  }

  if (!data || !data.connected) {
    return (
      <EmptyState
        icon={<Megaphone className="h-6 w-6" />}
        title={
          data?.reason
            ? `Ads not connected yet. ${data.reason}.`
            : "Ads not connected yet. Connect your Meta ad account to see which ads earn clicks."
        }
      />
    );
  }

  const tableHead = "px-6 py-3 text-label text-text-3";
  const rowClass = "border-b border-line transition-colors last:border-0 hover:bg-ground";

  return (
    <div>
      <p className="mb-4 text-caption text-text-3">
        {data.accountName && (
          <>
            Ad account <span className="font-mono text-text-2">{data.accountName}</span> &middot;{" "}
          </>
        )}
        last {data.days} days
        {data.lastSyncedAt && <> &middot; updated {new Date(data.lastSyncedAt).toLocaleString()}</>}
      </p>

      <KpiStrip
        className="mb-4 animate-in rail:grid-cols-4"
        cells={[
          { label: "Spent", value: money(data.totals.spend) },
          { label: "Views", value: data.totals.impressions.toLocaleString() },
          { label: "Clicks", value: data.totals.clicks.toLocaleString() },
          { label: "Click rate", value: `${data.totals.ctr}%` },
        ]}
      />

      <Card className="animate-in overflow-hidden p-0 md:p-0">
        <div className="flex items-center justify-between p-4 md:px-6">
          <h3 className="flex items-center gap-2 text-title text-text">
            <Megaphone className="h-4 w-4 text-text-3" />
            Ads that earn the most clicks per view
          </h3>
          <Badge variant="secondary">{data.topAds.length}</Badge>
        </div>
        {data.topAds.length === 0 ? (
          <p className="border-t border-line px-6 py-6 text-body-s text-text-3">
            No ad has reached 100 views in the last {data.days} days yet. Results show up after the next sync.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-y border-line">
                  <th className={tableHead}>Ad</th>
                  <th className={`${tableHead} text-right`}>Click rate</th>
                  <th className={`${tableHead} text-right`}>Clicks</th>
                  <th className={`${tableHead} text-right`}>Spent</th>
                  <th className={`${tableHead} text-right`}>Results</th>
                </tr>
              </thead>
              <tbody>
                {data.topAds.map((ad) => (
                  <tr key={ad.adId} className={rowClass}>
                    <td className="max-w-[320px] px-6 py-3 text-body-s text-text">
                      <span className="block truncate">{ad.adName ?? ad.adId}</span>
                      {ad.campaignName && (
                        <span className="block truncate text-caption text-text-3">{ad.campaignName}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">{ad.ctr}%</td>
                    <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                      {ad.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">{money(ad.spend)}</td>
                    <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                      {ad.conversions ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
