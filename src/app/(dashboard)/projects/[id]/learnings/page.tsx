"use client";

import { use, useEffect, useState } from "react";
import {
  Loader2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { createClient } from "@/src/lib/supabase/client";

interface Learning {
  id: string;
  channel: string;
  pattern_key: string;
  hypothesis: string;
  evidence: {
    lift?: number;
    sampleSize?: number;
    controlMean?: number;
    treatmentMean?: number;
    metric?: string;
  };
  confidence: number;
  generated_at: string;
}

interface PostPoint {
  posted_at: string;
  engagement: number;
  channel: string;
}

interface WeeklyPoint {
  week: string;
  x: number;
  linkedin: number;
}

export default function LearningsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const supabase = createClient();

  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [analyzerRunAt, setAnalyzerRunAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ls } = await supabase
        .from("post_learnings")
        .select("id, channel, pattern_key, hypothesis, evidence, confidence, generated_at")
        .eq("project_id", projectId)
        .eq("active", true)
        .order("confidence", { ascending: false });

      setLearnings((ls as Learning[]) ?? []);
      setAnalyzerRunAt(ls?.[0]?.generated_at ?? null);

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 28);

      const { data: posts } = await supabase
        .from("scheduled_posts")
        .select("posted_at, channel, post_metrics(likes, shares, comments)")
        .eq("project_id", projectId)
        .eq("status", "posted")
        .gte("posted_at", sinceDate.toISOString())
        .order("posted_at", { ascending: true });

      const points: PostPoint[] = (posts ?? [])
        .map((p) => {
          const m = Array.isArray(p.post_metrics) ? p.post_metrics[0] : p.post_metrics;
          const metrics = m as { likes?: number; shares?: number; comments?: number } | null;
          if (!metrics) return null;
          return {
            posted_at: p.posted_at as string,
            channel: p.channel as string,
            engagement:
              (metrics.likes ?? 0) + (metrics.shares ?? 0) + (metrics.comments ?? 0),
          };
        })
        .filter((x): x is PostPoint => x !== null);

      setWeekly(bucketByWeek(points));
      setLoading(false);
    })();
  }, [projectId, supabase]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const analyzerBoundary =
    analyzerRunAt && weekly.length > 0 ? weekToLabel(new Date(analyzerRunAt)) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learnings"
        description="What the analyzer has extracted from real performance. Active learnings are injected into every generation."
      />

      {learnings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-body">
              No active learnings yet. The analyzer needs at least 6 posted, synced
              posts in a 14-day window before it produces findings.
            </p>
            <p className="mt-2 text-small text-text-tertiary">
              Runs daily at 03:00 UTC, or trigger manually via
              {" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5">
                scripts/loop-closure/analyze-now.mjs
              </code>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {learnings.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-body text-text-primary">{l.hypothesis}</p>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {l.channel}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-small text-text-tertiary">
                  {l.evidence.lift !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {l.evidence.lift}x lift
                    </span>
                  )}
                  {l.evidence.sampleSize !== undefined && (
                    <span>n={l.evidence.sampleSize}</span>
                  )}
                  <span>confidence {Math.round(l.confidence * 100)}%</span>
                  <span className="font-mono">{l.pattern_key}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Weekly engagement (last 4 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          {weekly.length === 0 ? (
            <div className="py-12 text-center text-small text-text-tertiary">
              No metrics yet. Once posts publish and the sync cron runs, the
              before/after chart shows up here.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" />
                  <XAxis dataKey="week" stroke="var(--text-tertiary)" fontSize={12} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--surface-3)",
                      borderRadius: 8,
                    }}
                  />
                  {analyzerBoundary && (
                    <ReferenceLine
                      x={analyzerBoundary}
                      stroke="var(--accent-primary)"
                      strokeDasharray="3 3"
                      label={{ value: "analyzer", fill: "var(--accent-primary)", fontSize: 11 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="x"
                    stroke="var(--accent-primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="X"
                  />
                  <Line
                    type="monotone"
                    dataKey="linkedin"
                    stroke="var(--accent-secondary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="LinkedIn"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {analyzerRunAt && (
            <p className="mt-3 text-small text-text-tertiary">
              Latest analyzer run: {new Date(analyzerRunAt).toLocaleString()}. Posts
              after this point were generated with learnings injected.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function bucketByWeek(points: PostPoint[]): WeeklyPoint[] {
  if (points.length === 0) return [];

  const buckets = new Map<string, { x: number[]; linkedin: number[] }>();

  for (const p of points) {
    const label = weekToLabel(new Date(p.posted_at));
    if (!buckets.has(label)) buckets.set(label, { x: [], linkedin: [] });
    const bucket = buckets.get(label)!;
    if (p.channel === "x") bucket.x.push(p.engagement);
    else if (p.channel === "linkedin") bucket.linkedin.push(p.engagement);
  }

  return [...buckets.entries()]
    .map(([week, b]) => ({
      week,
      x: b.x.length > 0 ? Math.round(mean(b.x)) : 0,
      linkedin: b.linkedin.length > 0 ? Math.round(mean(b.linkedin)) : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

function weekToLabel(d: Date): string {
  // ISO week-ish label: YYYY-Www. Good enough for sort + display.
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
