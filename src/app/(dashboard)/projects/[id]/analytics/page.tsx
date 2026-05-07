"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Hash,
  Star,
  Clock,
  Loader2,
  BarChart3,
  TrendingUp,
  FileText,
  Zap,
  Search,
  MousePointerClick,
  Eye,
  ArrowUpDown,
  RefreshCw,
  DollarSign,
  Trophy,
  Heart,
  Share2,
  Download,
  Video,
  Unlink,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
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
  "seo-audit": "SEO Audit",
  "page-cro": "Page CRO",
  copywriting: "Copywriting",
  "social-content": "Social Content",
  "email-sequence": "Email Sequence",
  "content-strategy": "Content Strategy",
  "competitor-analysis": "Competitor Analysis",
  "blog-post": "Blog Post",
  "keyword-research": "Keyword Research",
  "growth-playbook": "Growth Playbook",
};

const ACCENT = "#D9663A";
const SURFACE_2 = "#1C1C22";
const BORDER = "#FFFFFF12";
const TEXT_TERTIARY = "#5E5A54";

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
    <div className="rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-small shadow-lg">
      <p className="text-text-tertiary mb-0.5">{label}</p>
      <p className="font-mono font-medium text-text-primary">{payload[0].value}</p>
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
        toast(data.error || "Failed to sync Google Search Console", "error");
        return;
      }
      setGscKeywords(data.topQueries ?? []);
      toast(
        data.synced > 0
          ? `Synced ${data.synced} queries from GSC`
          : "No query data returned from GSC yet",
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
    const supabase = createClient();
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("project_id", id)
      .eq("platform", platform);
    if (error) {
      toast(`Failed to disconnect ${platform.toUpperCase()}`, "error");
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
    toast(`${platform.toUpperCase()} disconnected from this project`, "info");
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
        toast(`Synced metrics for ${totalSynced} posts`, "success");
      } else {
        toast("No new metrics to sync yet", "info");
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

  const KW_COLORS = ["#D9663A", "#4ADE80", "#60A5FA", "#F59E0B", "#A78BFA"];

  // Biggest win
  const biggestWinAudit =
    firstScore !== null && latestScore !== null && latestScore > firstScore
      ? `Your audit score improved by +${latestScore - firstScore} points since you started`
      : null;
  const biggestWinPost = bestPost
    ? `Your best post got ${bestPost.impressions.toLocaleString()} impressions`
    : null;
  const biggestWin = biggestWinAudit || biggestWinPost;

  return (
    <div>
      <div className="flex items-start justify-between">
        <PageHeader
          title="Analytics"
          description="Impact dashboard — track your marketing progress"
        />
        <PdfDownloadButton
          href={`/api/projects/${id}/analytics/pdf`}
          filename="analytics-report.pdf"
        />
      </div>


      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
            {[
              {
                label: "AI Generations",
                value: totalGenerations,
                icon: Sparkles,
                delay: "0ms",
              },
              {
                label: "Assets Saved",
                value: totalAssets,
                icon: FileText,
                delay: "60ms",
              },
              {
                label: "Top Agent",
                value: mostUsedAgent ? (agentLabels[mostUsedAgent] ?? mostUsedAgent) : "—",
                icon: Star,
                delay: "120ms",
                small: true,
              },
              {
                label: "Avg Run Time",
                value: avgRunTime,
                icon: Clock,
                delay: "180ms",
              },
            ].map((stat) => (
              <Card
                key={stat.label}
                className="animate-in"
                style={{ animationDelay: stat.delay }}
              >
                <CardContent className="flex items-start justify-between p-5">
                  <div className="min-w-0">
                    <p className="text-caption text-text-tertiary">{stat.label}</p>
                    <p
                      className={`mt-1 font-semibold font-mono text-text-primary truncate ${stat.small ? "text-base" : "text-2xl"}`}
                      title={String(stat.value)}
                    >
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

          {/* Highlights Row */}
          {(scoreDelta !== null || mostActiveCount > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
              {scoreDelta !== null && (
                <Card className="animate-in" style={{ animationDelay: "240ms" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${scoreDelta >= 0 ? "bg-success/10" : "bg-error/10"}`}>
                      <TrendingUp className={`h-5 w-5 ${scoreDelta >= 0 ? "text-success" : "text-error"}`} />
                    </div>
                    <div>
                      <p className="text-caption text-text-tertiary">Audit Score Change</p>
                      <p className="text-body font-medium text-text-primary">
                        {scoreDelta >= 0 ? "+" : ""}{scoreDelta} points
                      </p>
                      <p className="text-small text-text-tertiary">
                        {firstScore} → {latestScore}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {mostActiveCount > 0 && (
                <Card className="animate-in" style={{ animationDelay: "300ms" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="rounded-xl p-3 bg-accent/10">
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-caption text-text-tertiary">Most Active Week</p>
                      <p className="text-body font-medium text-text-primary">
                        {mostActiveCount} generation{mostActiveCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-small text-text-tertiary">
                        Week of {mostActiveWeek ? new Date(mostActiveWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {latestScore !== null && (
                <Card className="animate-in" style={{ animationDelay: "360ms" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="rounded-xl p-3 bg-info/10">
                      <BarChart3 className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-caption text-text-tertiary">Latest Audit Score</p>
                      <p className="text-body font-medium text-text-primary">{latestScore}/100</p>
                      <p className="text-small text-text-tertiary">{audits.length} audit{audits.length !== 1 ? "s" : ""} total</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Audit Score Trend */}
            <Card className="animate-in" style={{ animationDelay: "120ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-h3">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Audit Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditTrendData.length < 2 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <p className="text-small text-text-tertiary">
                      {auditTrendData.length === 0
                        ? "Run an audit to start tracking your score"
                        : "Run at least 2 audits to see the trend"}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={auditTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: TEXT_TERTIARY, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: TEXT_TERTIARY, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: BORDER }} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={ACCENT}
                        strokeWidth={2}
                        dot={{ fill: ACCENT, r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: ACCENT }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Content Velocity */}
            <Card className="animate-in" style={{ animationDelay: "180ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-h3">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Content Velocity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {velocityData.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <p className="text-small text-text-tertiary">
                      Generate content to see weekly velocity
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: TEXT_TERTIARY, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: TEXT_TERTIARY, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE_2 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {velocityData.map((_, i) => (
                          <Cell key={i} fill={i === velocityData.length - 1 ? ACCENT : `${ACCENT}80`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Agent Usage Breakdown */}
          {agentBreakdown.length > 0 && (
            <Card className="animate-in mb-6" style={{ animationDelay: "240ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-h3">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  Agent Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agentBreakdown.map((item) => (
                    <div key={item.agent} className="flex items-center gap-3">
                      <span className="text-small text-text-secondary w-36 shrink-0 truncate">
                        {item.agent}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-700"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="text-small font-mono text-text-tertiary w-12 text-right shrink-0">
                        {item.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Biggest Win + Cost Tracker */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            {biggestWin && (
              <Card className="animate-in" style={{ animationDelay: "300ms" }}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-xl p-3 bg-accent/10">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-caption text-text-tertiary">Biggest Win</p>
                    <p className="text-body font-medium text-text-primary">
                      {biggestWin}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* AI cost card hidden */}
          </div>

          {/* Social Performance Section */}
          {postMetrics.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2 text-text-primary flex items-center gap-2">
                  <Heart className="h-5 w-5 text-accent" />
                  Social Performance
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSyncMetrics}
                  disabled={metricsSyncing}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${metricsSyncing ? "animate-spin" : ""}`} />
                  {metricsSyncing ? "Syncing..." : "Sync Now"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-4">
                {[
                  { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: Eye },
                  { label: "Total Likes", value: totalLikes.toLocaleString(), icon: Heart },
                  { label: "Total Shares", value: totalShares.toLocaleString(), icon: Share2 },
                  { label: "Best Post", value: bestPost ? `${bestPost.impressions.toLocaleString()} imp.` : "—", icon: Trophy },
                ].map((stat, i) => (
                  <Card key={stat.label} className="animate-in" style={{ animationDelay: `${i * 60}ms` }}>
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

              {socialBarData.length > 0 && (
                <Card className="animate-in" style={{ animationDelay: "120ms" }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-h3">
                      <BarChart3 className="h-4 w-4 text-accent" />
                      Weekly Impressions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={socialBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="week" tick={{ fill: TEXT_TERTIARY, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: TEXT_TERTIARY, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE_2 }} />
                        <Bar dataKey="impressions" radius={[4, 4, 0, 0]} fill={ACCENT} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {postMetrics.length > 0 && (
                <p className="text-small text-text-tertiary mt-2">
                  Last synced: {new Date(postMetrics[0].synced_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Keyword Ranking Tracker */}
          {trackedKeywords.length > 0 && (
            <Card className="animate-in mb-6" style={{ animationDelay: "180ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-h3">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Keyword Ranking Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={keywordChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="date" tick={{ fill: TEXT_TERTIARY, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      reversed
                      domain={[1, "auto"]}
                      tick={{ fill: TEXT_TERTIARY, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                      label={{ value: "Position", angle: -90, position: "insideLeft", fill: TEXT_TERTIARY, fontSize: 10 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    {trackedKeywords.map(([term], i) => (
                      <Line
                        key={term}
                        type="monotone"
                        dataKey={term}
                        stroke={KW_COLORS[i]}
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
            <Card className="animate-in mb-6">
              <CardContent className="flex flex-col items-center py-8 text-center">
                <TrendingUp className="h-6 w-6 text-text-tertiary mb-2" />
                <p className="text-small text-text-secondary">
                  Connect GSC and track keywords to see ranking trends
                </p>
                <p className="text-caption text-text-tertiary mt-1">
                  Sync GSC data at least twice to see position changes
                </p>
              </CardContent>
            </Card>
          )}

          {/* Search Performance (GSC) — empty state CTA when not connected */}
          {!gscConnected && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2 text-text-primary flex items-center gap-2">
                  <Search className="h-5 w-5 text-accent" />
                  Search Performance
                </h2>
              </div>
              <Card className="animate-in">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Search className="h-8 w-8 text-text-tertiary mb-3" />
                  <p className="text-body text-text-secondary">
                    Connect Google Search Console for this project
                  </p>
                  <p className="text-small text-text-tertiary mt-1 mb-4">
                    See real keyword performance, clicks, impressions, and
                    rank trends.
                  </p>
                  <Button size="sm" asChild>
                    <a href={`/api/integrations/gsc/connect?project_id=${id}`}>
                      Connect GSC
                    </a>
                  </Button>
                  <UnverifiedAppWarning />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search Performance — full widget when connected */}
          {gscConnected && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2 text-text-primary flex items-center gap-2">
                  <Search className="h-5 w-5 text-accent" />
                  Search Performance
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGscSync}
                    disabled={gscSyncing}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1.5 ${gscSyncing ? "animate-spin" : ""}`}
                    />
                    {gscSyncing ? "Syncing..." : "Sync GSC Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnectGoogle("gsc")}
                  >
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </div>
              </div>

              {gscKeywords.length > 0 && (
                <>
                  {/* GSC Stats Row */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-4">
                    {[
                      {
                        label: "Total Clicks",
                        value: gscKeywords
                          .reduce((s, k) => s + k.clicks, 0)
                          .toLocaleString(),
                        icon: MousePointerClick,
                      },
                      {
                        label: "Total Impressions",
                        value: gscKeywords
                          .reduce((s, k) => s + k.impressions, 0)
                          .toLocaleString(),
                        icon: Eye,
                      },
                      {
                        label: "Avg CTR",
                        value:
                          (
                            (gscKeywords.reduce((s, k) => s + k.ctr, 0) /
                              gscKeywords.length) *
                            100
                          ).toFixed(1) + "%",
                        icon: TrendingUp,
                      },
                      {
                        label: "Avg Position",
                        value: (
                          gscKeywords.reduce((s, k) => s + k.position, 0) /
                          gscKeywords.length
                        ).toFixed(1),
                        icon: ArrowUpDown,
                      },
                    ].map((stat, i) => (
                      <Card
                        key={stat.label}
                        className="animate-in"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <CardContent className="flex items-start justify-between p-5">
                          <div className="min-w-0">
                            <p className="text-caption text-text-tertiary">
                              {stat.label}
                            </p>
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

                  {/* Top Queries Table */}
                  <Card className="animate-in" style={{ animationDelay: "60ms" }}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Top Search Queries</span>
                        <Badge variant="secondary">{gscKeywords.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-border-subtle">
                              <th className="px-6 py-3 text-caption text-text-tertiary font-medium">
                                Query
                              </th>
                              <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                                Clicks
                              </th>
                              <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                                Impressions
                              </th>
                              <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                                CTR
                              </th>
                              <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                                Position
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscKeywords.slice(0, 20).map((kw) => (
                              <tr
                                key={kw.term}
                                className="border-b border-border-subtle last:border-0 hover:bg-surface-1/50 transition-colors"
                              >
                                <td className="px-6 py-3 text-small text-text-primary truncate max-w-[300px]">
                                  {kw.term}
                                </td>
                                <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                                  {kw.clicks.toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                                  {kw.impressions.toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                                  {(kw.ctr * 100).toFixed(1)}%
                                </td>
                                <td className="px-6 py-3 text-small text-text-secondary font-mono text-right">
                                  {kw.position.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {gscKeywords.length === 0 && (
                <Card className="animate-in">
                  <CardContent className="flex flex-col items-center py-12 text-center">
                    <Search className="h-8 w-8 text-text-tertiary mb-3" />
                    <p className="text-body text-text-secondary">
                      No GSC data yet
                    </p>
                    <p className="text-small text-text-tertiary mt-1">
                      Click &ldquo;Sync GSC Data&rdquo; to pull your search
                      performance metrics
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* GA4 Traffic */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2 text-text-primary flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Traffic & Engagement
              </h2>
              {ga4Connected && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnectGoogle("ga4")}
                >
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
            {ga4Connected && ga4HasProperty ? (
              <Ga4Widget projectId={id} />
            ) : ga4Connected && !ga4HasProperty ? (
              <Card className="animate-in">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <BarChart3 className="h-8 w-8 text-text-tertiary mb-3" />
                  <p className="text-body text-text-secondary">
                    No GA4 property selected
                  </p>
                  <p className="text-small text-text-tertiary mt-1 mb-4">
                    Disconnect and reconnect GA4 to pick a property.
                  </p>
                  <Button size="sm" variant="secondary" asChild>
                    <a href={`/api/integrations/ga4/connect?project_id=${id}`}>
                      Reconnect GA4
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="animate-in">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <BarChart3 className="h-8 w-8 text-text-tertiary mb-3" />
                  <p className="text-body text-text-secondary">
                    Connect Google Analytics 4 for this project
                  </p>
                  <p className="text-small text-text-tertiary mt-1 mb-4">
                    See traffic, top pages, and traffic sources alongside
                    your search performance.
                  </p>
                  <Button size="sm" asChild>
                    <a href={`/api/integrations/ga4/connect?project_id=${id}`}>
                      Connect GA4
                    </a>
                  </Button>
                  <UnverifiedAppWarning />
                </CardContent>
              </Card>
            )}
          </div>

          {/* YouTube Channel */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2 text-text-primary flex items-center gap-2">
                <Video className="h-5 w-5 text-accent" />
                YouTube Channel
              </h2>
              {youtubeConnected && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnectGoogle("youtube")}
                >
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
            {youtubeConnected ? (
              <YoutubeWidget projectId={id} />
            ) : (
              <Card className="animate-in">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Video className="h-8 w-8 text-text-tertiary mb-3" />
                  <p className="text-body text-text-secondary">
                    Connect YouTube for this project
                  </p>
                  <p className="text-small text-text-tertiary mt-1 mb-4">
                    See channel stats and recent video performance.
                  </p>
                  <Button size="sm" asChild>
                    <a href={`/api/integrations/youtube/connect?project_id=${id}`}>
                      Connect YouTube
                    </a>
                  </Button>
                  <UnverifiedAppWarning />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Generation History Table */}
          {generations.length === 0 ? (
            <Card className="animate-in" style={{ animationDelay: "300ms" }}>
              <CardContent>
                <div className="flex flex-col items-center py-16 text-center">
                  <BarChart3 className="h-10 w-10 text-text-tertiary mb-4" />
                  <p className="text-body text-text-secondary">No AI generations yet</p>
                  <p className="text-small text-text-tertiary mt-1">
                    Use the Content Studio or run an audit to see history here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="animate-in" style={{ animationDelay: "300ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generation History</span>
                  <Badge variant="secondary">{generations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium">Agent</th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">Duration</th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...generations].reverse().map((gen) => {
                        return (
                          <tr
                            key={gen.id}
                            className="border-b border-border-subtle last:border-0 hover:bg-surface-1/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <Badge variant="secondary">
                                {agentLabels[gen.agent_used as string] ?? gen.agent_used}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-small text-text-secondary text-right">
                              {gen.duration_ms ? `${(gen.duration_ms / 1000).toFixed(1)}s` : "—"}
                            </td>
                            <td className="px-6 py-4 text-small text-text-tertiary text-right whitespace-nowrap">
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
