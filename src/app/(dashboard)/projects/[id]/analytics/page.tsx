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
} from "lucide-react";
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";

// ---------- types ----------

interface Generation {
  id: string;
  agent_used: string;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
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

const ACCENT = "#D4945A";
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
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [gscKeywords, setGscKeywords] = useState<GscKeyword[]>([]);
  const [gscConnected, setGscConnected] = useState(false);
  const [gscSyncing, setGscSyncing] = useState(false);
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
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function handleGscSync() {
    setGscSyncing(true);
    const res = await fetch("/api/integrations/gsc/sync", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setGscKeywords(data.topQueries ?? []);
    }
    setGscSyncing(false);
  }

  // ---------- computed stats ----------

  const totalGenerations = generations.length;
  const totalTokens = generations.reduce(
    (sum, g) => sum + (g.input_tokens ?? 0) + (g.output_tokens ?? 0),
    0
  );
  const totalAssets = assets.length;

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

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Impact dashboard — track your marketing progress"
      />

      <ProjectNav projectId={id} />

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
                label: "Tokens Used",
                value: totalTokens.toLocaleString(),
                icon: Hash,
                delay: "120ms",
              },
              {
                label: "Top Agent",
                value: mostUsedAgent ? (agentLabels[mostUsedAgent] ?? mostUsedAgent) : "—",
                icon: Star,
                delay: "180ms",
                small: true,
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
                    <p className={`mt-1 font-semibold font-mono text-text-primary truncate ${stat.small ? "text-lg" : "text-2xl"}`}>
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

          {/* Search Performance (GSC) */}
          {gscConnected && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2 text-text-primary flex items-center gap-2">
                  <Search className="h-5 w-5 text-accent" />
                  Search Performance
                </h2>
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
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium">Model</th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">Tokens</th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">Duration</th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...generations].reverse().map((gen) => {
                        const tokens = (gen.input_tokens ?? 0) + (gen.output_tokens ?? 0);
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
                            <td className="px-6 py-4 text-small text-text-secondary font-mono">
                              {gen.model ? gen.model.replace("claude-", "").slice(0, 20) : "—"}
                            </td>
                            <td className="px-6 py-4 text-small text-text-secondary font-mono text-right">
                              {tokens.toLocaleString()}
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
