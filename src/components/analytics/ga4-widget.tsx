"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  Eye,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

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
      <Card className="animate-in">
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-small text-text-tertiary">
            Loading GA4 data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="animate-in">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <BarChart3 className="h-8 w-8 text-text-tertiary mb-3" />
          <p className="text-body text-text-secondary">{error}</p>
          <p className="text-small text-text-tertiary mt-1">
            Reconnect GA4 in Settings &rarr; Integrations or pick a property.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalsCards = [
    {
      label: "Active Users",
      value: data.totals.activeUsers.toLocaleString(),
      icon: Users,
    },
    {
      label: "Sessions",
      value: data.totals.sessions.toLocaleString(),
      icon: Activity,
    },
    {
      label: "Page Views",
      value: data.totals.screenPageViews.toLocaleString(),
      icon: Eye,
    },
    {
      label: "Avg Session",
      value: formatDuration(data.totals.averageSessionDuration),
      icon: Clock,
    },
  ];

  return (
    <div>
      {data.propertyDisplay && (
        <p className="text-caption text-text-tertiary mb-4">
          Property:{" "}
          <span className="text-text-secondary font-mono">
            {data.propertyDisplay}
          </span>{" "}
          &middot; Last {data.days} days
        </p>
      )}

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-4">
        {totalsCards.map((stat, i) => (
          <Card
            key={stat.label}
            className="animate-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="flex items-start justify-between p-5">
              <div className="min-w-0">
                <p className="text-caption text-text-tertiary">{stat.label}</p>
                <p className="mt-1 font-semibold font-mono text-text-primary text-2xl">
                  {stat.value}
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-2 shrink-0 ml-2">
                <stat.icon className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: Top Pages + Top Sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Pages */}
        <Card className="animate-in" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-accent" />
                Top Pages
              </span>
              <Badge variant="secondary">{data.topPages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.topPages.length === 0 ? (
              <p className="px-6 py-6 text-small text-text-tertiary">
                No page data in the last {data.days} days.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="px-6 py-3 text-caption text-text-tertiary font-medium">
                        Path
                      </th>
                      <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                        Views
                      </th>
                      <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                        Engagement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.slice(0, 10).map((row) => (
                      <tr
                        key={row.pagePath}
                        className="border-b border-border-subtle last:border-0 hover:bg-surface-1/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-small text-text-primary truncate max-w-[280px] font-mono">
                          {row.pagePath || "/"}
                        </td>
                        <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                          {row.pageViews.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                          {(row.engagementRate * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sources */}
        <Card className="animate-in" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Top Sources
              </span>
              <Badge variant="secondary">{data.topSources.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.topSources.length === 0 ? (
              <p className="px-6 py-6 text-small text-text-tertiary">
                No traffic source data in the last {data.days} days.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="px-6 py-3 text-caption text-text-tertiary font-medium">
                        Source / Medium
                      </th>
                      <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                        Sessions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSources.slice(0, 10).map((row, i) => (
                      <tr
                        key={`${row.source}-${row.medium}-${i}`}
                        className="border-b border-border-subtle last:border-0 hover:bg-surface-1/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-small text-text-primary truncate max-w-[280px]">
                          <span className="font-mono">{row.source || "(direct)"}</span>
                          <span className="text-text-tertiary"> / {row.medium || "none"}</span>
                        </td>
                        <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                          {row.sessions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
