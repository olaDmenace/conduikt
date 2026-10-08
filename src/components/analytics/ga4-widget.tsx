"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, TrendingUp } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";

interface Ga4Summary {
  property: string;
  propertyDisplay: string | null;
  days: number;
  totals: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    engagementRate: number;
    conversions: number;
  };
  topPages: Array<{
    pagePath: string;
    pageViews: number;
    sessions: number;
    engagementRate: number;
  }>;
  topSources: Array<{
    source: string;
    medium: string;
    sessions: number;
  }>;
}

function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface Props {
  projectId: string;
}

export function Ga4Widget({ projectId }: Props) {
  const [data, setData] = useState<Ga4Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/integrations/ga4/summary?projectId=${encodeURIComponent(projectId)}&days=28`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `GA4 fetch failed (${res.status})`);
        }
        const json = (await res.json()) as Ga4Summary;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "GA4 fetch failed");
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
      <div className="space-y-4" role="status" aria-label="Loading Google Analytics">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line rail:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 bg-surface p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title={`We couldn't load Google Analytics: ${error}. Reconnect it in Settings, then Connected accounts, or pick a property.`}
      />
    );
  }

  if (!data) return null;

  const tableHead = "px-6 py-3 text-label text-text-3";
  const rowClass =
    "border-b border-line transition-colors last:border-0 hover:bg-ground";

  return (
    <div>
      {data.propertyDisplay && (
        <p className="mb-4 text-caption text-text-3">
          Property{" "}
          <span className="font-mono text-text-2">{data.propertyDisplay}</span>{" "}
          &middot; last {data.days} days
        </p>
      )}

      {/* Totals */}
      <KpiStrip
        className="mb-4 animate-in rail:grid-cols-4"
        cells={[
          { label: "Visitors", value: data.totals.activeUsers.toLocaleString() },
          { label: "Visits", value: data.totals.sessions.toLocaleString() },
          { label: "Pages viewed", value: data.totals.screenPageViews.toLocaleString() },
          {
            label: "Average visit",
            value: formatDuration(data.totals.averageSessionDuration),
          },
        ]}
      />

      {/* Top pages + where visitors come from */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between p-4 md:px-6">
            <h3 className="flex items-center gap-2 text-title text-text">
              <Eye className="h-4 w-4 text-text-3" />
              Top pages
            </h3>
            <Badge variant="secondary">{data.topPages.length}</Badge>
          </div>
          {data.topPages.length === 0 ? (
            <p className="border-t border-line px-6 py-6 text-body-s text-text-3">
              No page visits in the last {data.days} days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-line">
                    <th className={tableHead}>Page</th>
                    <th className={`${tableHead} text-right`}>Views</th>
                    <th className={`${tableHead} text-right`}>Engaged</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.slice(0, 10).map((row) => (
                    <tr key={row.pagePath} className={rowClass}>
                      <td className="max-w-[280px] truncate px-6 py-3 font-mono text-body-s text-text">
                        {row.pagePath || "/"}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                        {row.pageViews.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                        {(row.engagementRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center justify-between p-4 md:px-6">
            <h3 className="flex items-center gap-2 text-title text-text">
              <TrendingUp className="h-4 w-4 text-text-3" />
              Where visitors come from
            </h3>
            <Badge variant="secondary">{data.topSources.length}</Badge>
          </div>
          {data.topSources.length === 0 ? (
            <p className="border-t border-line px-6 py-6 text-body-s text-text-3">
              No visitor sources in the last {data.days} days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-line">
                    <th className={tableHead}>Source</th>
                    <th className={`${tableHead} text-right`}>Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSources.slice(0, 10).map((row, i) => (
                    <tr key={`${row.source}-${row.medium}-${i}`} className={rowClass}>
                      <td className="max-w-[280px] truncate px-6 py-3 text-body-s text-text">
                        <span className="font-mono">{row.source || "(direct)"}</span>
                        <span className="text-text-3"> / {row.medium || "none"}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                        {row.sessions.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
