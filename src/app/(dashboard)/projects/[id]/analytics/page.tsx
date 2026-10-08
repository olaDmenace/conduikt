"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Clock,
  BarChart3,
  TrendingUp,
  Search,
  RefreshCw,
  Trophy,
  Heart,
  Video,
  Unlink,
} from "@/src/components/ui/lucide-icons";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InkCard,
} from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import { createClient } from "@/src/lib/supabase/client";
import { Ga4Widget } from "@/src/components/analytics/ga4-widget";
import { YoutubeWidget } from "@/src/components/analytics/youtube-widget";
import { UnverifiedAppWarning } from "@/src/components/analytics/unverified-app-warning";


// ---------- types ----------

interface Generation {
  id: string;
  agent_used: string;
  // input_tokens / output_tokens / model deliberately removed from the
  // user-facing analytics shape. The columns still exist in the DB for
  // admin reporting and pricing — just not surfaced here.
  duration_ms: number | null;
  created_at: string;
}

interface AuditRecord {
  id: string;
  type: string;
  url: string;
  score: number | null;
  created_at: string;
}

interface AssetRecord {
  id: string;
  type: string;
  channel: string | null;
  status: string;
  created_at: string;
}

interface GscKeyword {
  term: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PostMetric {
  id: string;
  channel: string;
  impressions: number;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  synced_at: string;
  created_at: string;
}

interface KeywordTracking {
  term: string;
  position: number;
  date_range_start: string;
}

// ---------- constants ----------

const agentLabels: Record<string, string> = {
  "seo-audit": "Site Audit",
  "page-cro": "Conversion Check",
  copywriting: "Copywriter",
  "social-content": "Social",
  "email-sequence": "Email",
  "content-strategy": "Strategy",
  "competitor-analysis": "Competitor Watch",
  "blog-post": "Blog",
  "keyword-research": "Keyword Finder",
  "growth-playbook": "Growth Plan",
};

// Chart colours come from the tokens (docs/DESIGN.md: teal for the primary
// series, text-3 for axes, line for the grid).
const TEAL = "var(--teal)";
const SURFACE_2 = "var(--surface-2)";
const LINE = "var(--line)";
const TEXT_3 = "var(--text-3)";

// ---------- helpers ----------

function formatDate(iso: string, short = false) {
  const d = new Date(iso);
  return short
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getWeekKey(iso: string) {
  const d = new Date(iso);
  // Get Monday of the week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

// ---------- custom tooltip ----------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-body-s shadow-[var(--shadow-float)]">
      <p className="text-text-3 mb-0.5">{label}</p>
      <p className="font-mono font-medium text-text">{payload[0].value}</p>
    </div>
  );
}

// ---------- component ----------

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [gscKeywords, setGscKeywords] = useState<GscKeyword[]>([]);
  const [gscConnected, setGscConnected] = useState(false);
  const [gscSyncing, setGscSyncing] = useState(false);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [ga4HasProperty, setGa4HasProperty] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [postMetrics, setPostMetrics] = useState<PostMetric[]>([]);
  const [keywordTracking, setKeywordTracking] = useState<KeywordTracking[]>([]);
  const [metricsSyncing, setMetricsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/projects/${id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setGenerations(data.generations ?? []);
        setAudits(data.audits ?? []);
        setAssets(data.assets ?? []);
        setGscKeywords(data.gscKeywords ?? []);
        setGscConnected(data.gscConnected ?? false);
        setGa4Connected(data.ga4Connected ?? false);
        setGa4HasProperty(data.ga4HasProperty ?? false);
        setYoutubeConnected(data.youtubeConnected ?? false);
        setPostMetrics(data.postMetrics ?? []);
        setKeywordTracking(data.keywordTracking ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function handleGscSync() {
    setGscSyncing(true);
    try {
      const res = await fetch("/api/integrations/gsc/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn't update your Google search data. Try again.", "error");
        return;
      }
      setGscKeywords(data.topQueries ?? []);
      toast(
        data.synced > 0
          ? `Updated ${data.synced} searches from Google`
          : "Google has no search data for this site yet",
        data.synced > 0 ? "success" : "info"
      );
    } finally {
      setGscSyncing(false);
    }
  }

  // Disconnect a per-project Google integration. Deletes the row from
  // connected_accounts (RLS scopes the delete to rows the user owns)
  // then resets the page state so the empty-state Connect CTA shows.
  async function handleDisconnectGoogle(platform: "gsc" | "ga4" | "youtube") {
    const googleName = {
      gsc: "Google Search Console",
      ga4: "Google Analytics",
      youtube: "YouTube",
    } as const;
    const supabase = createClient();
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("project_id", id)
      .eq("platform", platform);
    if (error) {
      toast(`Couldn't disconnect ${googleName[platform]}. Try again.`, "error");
      return;
    }
    if (platform === "gsc") {
      setGscConnected(false);
      setGscKeywords([]);
    } else if (platform === "ga4") {
      setGa4Connected(false);
      setGa4HasProperty(false);
    } else {
      setYoutubeConnected(false);
    }
    toast(`${googleName[platform]} disconnected from this project`, "info");
  }

  async function handleSyncMetrics() {
    setMetricsSyncing(true);
    try {
      const [xRes, liRes] = await Promise.all([
        fetch("/api/integrations/x/sync-metrics", { method: "POST" }),
        fetch("/api/integrations/linkedin/sync-metrics", { method: "POST" }),
      ]);

      const xData = await xRes.json().catch(() => ({}));
      const liData = await liRes.json().catch(() => ({}));

      const problems: string[] = [];
      if (!xRes.ok && xData.error) problems.push(`X: ${xData.error}`);
      if (!liRes.ok && liData.error) problems.push(`LinkedIn: ${liData.error}`);

      const totalSynced = (xData.synced ?? 0) + (liData.synced ?? 0);

      const res = await fetch(`/api/projects/${id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setPostMetrics(data.postMetrics ?? []);
      }

      if (problems.length > 0) {
        toast(problems.join(" · "), "error");
      } else if (totalSynced > 0) {
        toast(`Updated numbers for ${totalSynced} posts`, "success");
      } else {
        toast("No new numbers yet", "info");
      }
    } finally {
      setMetricsSyncing(false);
    }
  }

  // ---------- computed stats ----------

  const totalGenerations = generations.length;
  const totalAssets = assets.length;
  const avgRunTimeMs = generations.length
    ? generations.reduce((s, g) => s + (g.duration_ms ?? 0), 0) /
      generations.length
    : 0;
  const avgRunTime =
    avgRunTimeMs >= 1000
      ? `${(avgRunTimeMs / 1000).toFixed(1)}s`
      : `${Math.round(avgRunTimeMs)}ms`;

  const agentCounts: Record<string, number> = {};
  for (const g of generations) {
    agentCounts[g.agent_used] = (agentCounts[g.agent_used] ?? 0) + 1;
  }
  const mostUsedAgent =
    Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Audit score trend data
  const auditTrendData = audits
    .filter((a) => a.score !== null)
    .map((a) => ({
      date: formatDate(a.created_at, true),
      score: a.score as number,
    }));

  // Score improvement
  const firstScore = auditTrendData[0]?.score ?? null;
  const latestScore = auditTrendData[auditTrendData.length - 1]?.score ?? null;
  const scoreDelta =
    firstScore !== null && latestScore !== null ? latestScore - firstScore : null;

  // Weekly content velocity (last 8 weeks)
  const weekCounts: Record<string, number> = {};
  for (const g of generations) {
    const wk = getWeekKey(g.created_at);
    weekCounts[wk] = (weekCounts[wk] ?? 0) + 1;
  }
  const sortedWeeks = Object.keys(weekCounts).sort();
  const last8Weeks = sortedWeeks.slice(-8);
  const velocityData = last8Weeks.map((wk) => ({
    week: new Date(wk).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    count: weekCounts[wk],
  }));

  // Agent usage breakdown (top 6)
  const agentBreakdown = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([agent, count]) => ({
      agent: agentLabels[agent] ?? agent,
      count,
      pct: Math.round((count / totalGenerations) * 100),
    }));

  // Most active week
  const mostActiveWeek = sortedWeeks.length
    ? sortedWeeks.reduce((a, b) => (weekCounts[a] > weekCounts[b] ? a : b))
    : null;
  const mostActiveCount = mostActiveWeek ? weekCounts[mostActiveWeek] : 0;


  // Social performance — weekly impressions
  const socialWeekly: Record<string, number> = {};
  for (const m of postMetrics) {
    const wk = getWeekKey(m.created_at);
    socialWeekly[wk] = (socialWeekly[wk] ?? 0) + m.impressions;
  }
  const socialWeekKeys = Object.keys(socialWeekly).sort().slice(-8);
  const socialBarData = socialWeekKeys.map((wk) => ({
    week: new Date(wk).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    impressions: socialWeekly[wk],
  }));

  // Total social stats
  const totalImpressions = postMetrics.reduce((s, m) => s + m.impressions, 0);
  const totalLikes = postMetrics.reduce((s, m) => s + m.likes, 0);
  const totalShares = postMetrics.reduce((s, m) => s + m.shares, 0);
  const bestPost = postMetrics.length
    ? postMetrics.reduce((best, m) => (m.impressions > best.impressions ? m : best))
    : null;

  // Keyword ranking tracking — build line chart data
  const kwByTerm: Record<string, Array<{ date: string; position: number }>> = {};
  for (const kw of keywordTracking) {
    if (!kwByTerm[kw.term]) kwByTerm[kw.term] = [];
    kwByTerm[kw.term].push({ date: kw.date_range_start, position: kw.position });
  }
  // Only show keywords with 2+ data points, max 5 keywords
  const trackedKeywords = Object.entries(kwByTerm)
    .filter(([, pts]) => pts.length >= 2)
    .slice(0, 5);

  // Build unified date axis for keyword chart
  const kwDates = [...new Set(keywordTracking.map((k) => k.date_range_start))].sort();
  const keywordChartData = kwDates.map((date) => {
    const point: Record<string, unknown> = {
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    for (const [term] of trackedKeywords) {
      const match = kwByTerm[term].find((p) => p.date === date);
      point[term] = match?.position ?? null;
    }
    return point;
  });

  // Up to five tracked search terms. Teal is the primary series, the accent
  // the comparison; the rest stay inside the token palette and are told
  // apart by dash pattern as well as colour.
  const KW_COLORS = [
    "var(--teal)",
    "var(--accent)",
    "var(--text)",
    "var(--ink-teal)",
    "var(--accent-display)",
  ];
  const KW_DASHES = [undefined, "6 3", "2 3", "8 3 2 3", "4 4"];

  // Biggest win
  const biggestWinAudit =
    firstScore !== null && latestScore !== null && latestScore > firstScore
      ? `Your site score went up ${latestScore - firstScore} points since you started`
      : null;
  const biggestWinPost = bestPost
    ? `Your best post got ${bestPost.impressions.toLocaleString()} views`
    : null;
  const biggestWin = biggestWinAudit || biggestWinPost;

  const sectionHeading = "flex items-center gap-2 text-heading text-text";
  const emptyCard = "flex flex-col items-center py-8 text-center";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Analytics"
          description="What your marketing is doing for you, week by week"
        />
        <PdfDownloadButton
          href={`/api/projects/${id}/analytics/pdf`}
          filename="analytics-report.pdf"
        />
      </div>

      {loading ? (
        <div className="space-y-6" role="status" aria-label="Loading">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line rail:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 bg-surface p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <KpiStrip
            className="mb-6 animate-in rail:grid-cols-4"
            cells={[
              {
                label: "Pieces of content",
                value: totalGenerations.toLocaleString(),
              },
              {
                label: "Saved to library",
                value: totalAssets.toLocaleString(),
              },
              {
                label: "Most used agent",
                value: mostUsedAgent
                  ? (agentLabels[mostUsedAgent] ?? mostUsedAgent)
                  : "None yet",
              },
              {
                label: "Average time per piece",
                value: totalGenerations ? avgRunTime : "None yet",
              },
            ]}
          />

          {/* Highlights */}
          {(scoreDelta !== null || mostActiveCount > 0) && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scoreDelta !== null && (
                <Card className="animate-in" style={{ animationDelay: "80ms" }}>
                  <p className="text-label text-text-3">Site score change</p>
                  <p
                    className={`mt-2 text-numeric text-3xl ${scoreDelta >= 0 ? "text-teal" : "text-warning"}`}
                  >
                    {scoreDelta >= 0 ? "+" : ""}
                    {scoreDelta} points
                  </p>
                  <p className="mt-1 text-body-s text-text-3">
                    From {firstScore} to {latestScore} out of 100
                  </p>
                </Card>
              )}
              {mostActiveCount > 0 && (
                <Card className="animate-in" style={{ animationDelay: "160ms" }}>
                  <p className="text-label text-text-3">Busiest week</p>
                  <p className="mt-2 text-numeric text-3xl text-text">
                    {mostActiveCount} {mostActiveCount !== 1 ? "pieces" : "piece"}
                  </p>
                  <p className="mt-1 text-body-s text-text-3">
                    Week of{" "}
                    {mostActiveWeek
                      ? new Date(mostActiveWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "unknown"}
                  </p>
                </Card>
              )}
              {latestScore !== null && (
                <Card className="animate-in" style={{ animationDelay: "240ms" }}>
                  <p className="text-label text-text-3">Latest site score</p>
                  <p className="mt-2 text-numeric text-3xl text-text">
                    {latestScore} out of 100
                  </p>
                  <p className="mt-1 text-body-s text-text-3">
                    {audits.length} site {audits.length !== 1 ? "checks" : "check"} so far
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Charts */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Site score trend */}
            <Card className="animate-in" style={{ animationDelay: "80ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-text-3" />
                  Site score over time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditTrendData.length < 2 ? (
                  <div className={emptyCard}>
                    <p className="text-body-s text-text-3">
                      {auditTrendData.length === 0
                        ? "Check your site to start tracking your score."
                        : "Check your site once more to see the trend."}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={auditTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: TEXT_3, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: TEXT_3, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: LINE }} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={TEAL}
                        strokeWidth={2}
                        dot={{ fill: TEAL, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: TEAL }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Content per week */}
            <Card className="animate-in" style={{ animationDelay: "160ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-text-3" />
                  Content made each week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {velocityData.length === 0 ? (
                  <div className={emptyCard}>
                    <p className="text-body-s text-text-3">
                      Make your first piece of content to see this chart.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: TEXT_3, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: TEXT_3, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE_2 }} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {velocityData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={TEAL}
                            fillOpacity={i === velocityData.length - 1 ? 1 : 0.45}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Agent usage */}
          {agentBreakdown.length > 0 && (
            <Card className="mb-6 animate-in" style={{ animationDelay: "240ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-text-3" />
                  Which agents you use most
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agentBreakdown.map((item) => (
                    <div key={item.agent} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-body-s text-text-2">
                        {item.agent}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-teal transition-all duration-700"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-body-s text-text-3">
                        {item.count} {item.count === 1 ? "run" : "runs"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Biggest win */}
          {biggestWin && (
            <InkCard className="mb-6 flex animate-in items-center gap-4" style={{ animationDelay: "300ms" }}>
              <Trophy className="h-5 w-5 shrink-0 text-ink-accent" />
              <div>
                <p className="text-label text-ink-text-3">Biggest win</p>
                <p className="mt-1 text-title text-ink-text">{biggestWin}</p>
              </div>
            </InkCard>
          )}

          {/* Social performance */}
          {postMetrics.length > 0 && (
            <section className="mb-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className={sectionHeading}>
                  <Heart className="h-5 w-5 text-text-3" />
                  How your posts are doing
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSyncMetrics}
                  disabled={metricsSyncing}
                >
                  {!metricsSyncing && <RefreshCw className="h-3.5 w-3.5" />}
                  {metricsSyncing ? "Updating…" : "Update now"}
                </Button>
              </div>

              <KpiStrip
                className="mb-4 animate-in rail:grid-cols-4"
                cells={[
                  { label: "Views", value: totalImpressions.toLocaleString() },
                  { label: "Likes", value: totalLikes.toLocaleString() },
                  { label: "Shares", value: totalShares.toLocaleString() },
                  {
                    label: "Best post",
                    value: bestPost
                      ? `${bestPost.impressions.toLocaleString()} views`
                      : "None yet",
                  },
                ]}
              />

              {socialBarData.length > 0 && (
                <Card className="animate-in" style={{ animationDelay: "80ms" }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-text-3" />
                      Views each week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={socialBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                        <XAxis dataKey="week" tick={{ fill: TEXT_3, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: TEXT_3, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE_2 }} />
                        <Bar dataKey="impressions" radius={[2, 2, 0, 0]} fill={TEAL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <p className="mt-2 text-caption text-text-3">
                Last updated {new Date(postMetrics[0].synced_at).toLocaleString()}
              </p>
            </section>
          )}

          {/* Search ranking tracker */}
          {trackedKeywords.length > 0 && (
            <Card className="mb-6 animate-in" style={{ animationDelay: "160ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-text-3" />
                  Where you rank on Google
                </CardTitle>
                <CardDescription>Lower is better. 1 is the top result.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={keywordChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: TEXT_3, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      reversed
                      domain={[1, "auto"]}
                      tick={{ fill: TEXT_3, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                      label={{ value: "Rank", angle: -90, position: "insideLeft", fill: TEXT_3, fontSize: 12 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {trackedKeywords.map(([term], i) => (
                      <Line
                        key={term}
                        type="monotone"
                        dataKey={term}
                        stroke={KW_COLORS[i]}
                        strokeDasharray={KW_DASHES[i]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: KW_COLORS[i] }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {gscConnected && trackedKeywords.length === 0 && (
            <EmptyState
              className="mb-6"
              icon={<TrendingUp className="h-6 w-6" />}
              title="Update your Google search data at least twice to see how your rank changes."
            />
          )}

          {/* Google search — not connected */}
          {!gscConnected && (
            <section className="mb-6">
              <h2 className={`mb-4 ${sectionHeading}`}>
                <Search className="h-5 w-5 text-text-3" />
                How people find you on Google
              </h2>
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="Connect Google Search Console to see the searches that bring people to your site, and where you rank."
                action={
                  <div className="flex flex-col items-center">
                    <Button size="sm" asChild>
                      <a href={`/api/integrations/gsc/connect?project_id=${id}`}>
                        Connect Google Search Console
                      </a>
                    </Button>
                    <UnverifiedAppWarning />
                  </div>
                }
              />
            </section>
          )}

          {/* Google search — connected */}
          {gscConnected && (
            <section className="mb-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className={sectionHeading}>
                  <Search className="h-5 w-5 text-text-3" />
                  How people find you on Google
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGscSync}
                    disabled={gscSyncing}
                  >
                    {!gscSyncing && <RefreshCw className="h-3.5 w-3.5" />}
                    {gscSyncing ? "Updating…" : "Update search data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnectGoogle("gsc")}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>

              {gscKeywords.length > 0 && (
                <>
                  <KpiStrip
                    className="mb-4 animate-in rail:grid-cols-4"
                    cells={[
                      {
                        label: "Clicks from Google",
                        value: gscKeywords
                          .reduce((s, k) => s + k.clicks, 0)
                          .toLocaleString(),
                      },
                      {
                        label: "Views in Google",
                        value: gscKeywords
                          .reduce((s, k) => s + k.impressions, 0)
                          .toLocaleString(),
                      },
                      {
                        label: "Click rate",
                        value:
                          (
                            (gscKeywords.reduce((s, k) => s + k.ctr, 0) /
                              gscKeywords.length) *
                            100
                          ).toFixed(1) + "%",
                      },
                      {
                        label: "Average rank",
                        value: (
                          gscKeywords.reduce((s, k) => s + k.position, 0) /
                          gscKeywords.length
                        ).toFixed(1),
                      },
                    ]}
                  />

                  {/* Top searches */}
                  <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "80ms" }}>
                    <div className="flex items-center justify-between p-4 md:px-6">
                      <h3 className="text-title text-text">Top searches</h3>
                      <Badge variant="secondary">{gscKeywords.length}</Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-y border-line">
                            <th className="px-6 py-3 text-label text-text-3">Search</th>
                            <th className="px-6 py-3 text-right text-label text-text-3">Clicks</th>
                            <th className="px-6 py-3 text-right text-label text-text-3">Views</th>
                            <th className="px-6 py-3 text-right text-label text-text-3">Click rate</th>
                            <th className="px-6 py-3 text-right text-label text-text-3">Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gscKeywords.slice(0, 20).map((kw) => (
                            <tr
                              key={kw.term}
                              className="border-b border-line transition-colors last:border-0 hover:bg-ground"
                            >
                              <td className="max-w-[300px] truncate px-6 py-3 text-body-s text-text">
                                {kw.term}
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                                {kw.clicks.toLocaleString()}
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                                {kw.impressions.toLocaleString()}
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                                {(kw.ctr * 100).toFixed(1)}%
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-body-s text-text-2">
                                {kw.position.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}

              {gscKeywords.length === 0 && (
                <EmptyState
                  icon={<Search className="h-6 w-6" />}
                  title="No search data yet. Press “Update search data” to pull it from Google."
                />
              )}
            </section>
          )}

          {/* Google Analytics traffic */}
          <section className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={sectionHeading}>
                <BarChart3 className="h-5 w-5 text-text-3" />
                Visitors to your site
              </h2>
              {ga4Connected && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnectGoogle("ga4")}
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              )}
            </div>
            {ga4Connected && ga4HasProperty ? (
              <Ga4Widget projectId={id} />
            ) : ga4Connected && !ga4HasProperty ? (
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="No Google Analytics property picked yet. Reconnect to choose one."
                action={
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/api/integrations/ga4/connect?project_id=${id}`}>
                      Reconnect Google Analytics
                    </a>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="Connect Google Analytics to see visitors, top pages and where they come from."
                action={
                  <div className="flex flex-col items-center">
                    <Button size="sm" asChild>
                      <a href={`/api/integrations/ga4/connect?project_id=${id}`}>
                        Connect Google Analytics
                      </a>
                    </Button>
                    <UnverifiedAppWarning />
                  </div>
                }
              />
            )}
          </section>

          {/* YouTube */}
          <section className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={sectionHeading}>
                <Video className="h-5 w-5 text-text-3" />
                YouTube channel
              </h2>
              {youtubeConnected && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnectGoogle("youtube")}
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              )}
            </div>
            {youtubeConnected ? (
              <YoutubeWidget projectId={id} />
            ) : (
              <EmptyState
                icon={<Video className="h-6 w-6" />}
                title="Connect YouTube to see channel stats and how recent videos are doing."
                action={
                  <div className="flex flex-col items-center">
                    <Button size="sm" asChild>
                      <a href={`/api/integrations/youtube/connect?project_id=${id}`}>
                        Connect YouTube
                      </a>
                    </Button>
                    <UnverifiedAppWarning />
                  </div>
                }
              />
            )}
          </section>

          {/* Content history */}
          {generations.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title="Nothing made yet. Use an agent or check your site and it shows up here."
            />
          ) : (
            <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center justify-between p-4 md:px-6">
                <h3 className="text-title text-text">Everything made for this project</h3>
                <Badge variant="secondary">{generations.length}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y border-line">
                      <th className="px-6 py-3 text-label text-text-3">Agent</th>
                      <th className="px-6 py-3 text-right text-label text-text-3">Took</th>
                      <th className="px-6 py-3 text-right text-label text-text-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...generations].reverse().map((gen) => {
                      return (
                        <tr
                          key={gen.id}
                          className="border-b border-line transition-colors last:border-0 hover:bg-ground"
                        >
                          <td className="px-6 py-4">
                            <Badge variant="secondary">
                              {agentLabels[gen.agent_used as string] ?? gen.agent_used}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-body-s text-text-2">
                            {gen.duration_ms ? `${(gen.duration_ms / 1000).toFixed(1)}s` : "Not recorded"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-body-s text-text-3">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {formatDate(gen.created_at)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
