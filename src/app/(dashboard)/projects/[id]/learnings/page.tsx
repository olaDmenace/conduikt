"use client";

import { use, useEffect, useState } from "react";
import {
  TrendingUp,
  Sparkles,
} from "@/src/components/ui/lucide-icons";
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
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
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
      <div className="space-y-8" role="status" aria-label="Loading learnings">
        <Skeleton className="h-10 w-60" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const analyzerBoundary =
    analyzerRunAt && weekly.length > 0 ? weekToLabel(new Date(analyzerRunAt)) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learnings"
        description="What we've learned from how your posts actually performed. Every new piece of content uses these."
      />

      {learnings.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="Nothing learned yet. We need at least 6 published posts with stats from the last 14 days. We check every day at 03:00 UTC."
        />
      ) : (
        <div className="space-y-3">
          {learnings.map((l) => (
            <Card key={l.id}>
              <CardContent>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-body text-text">{l.hypothesis}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {l.channel}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-caption text-text-3">
                  {l.evidence.lift !== undefined && (
                    <span className="inline-flex items-center gap-1 font-mono text-teal">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {l.evidence.lift}x lift
                    </span>
                  )}
                  {l.evidence.sampleSize !== undefined && (
                    <span className="font-mono">{l.evidence.sampleSize} posts</span>
                  )}
                  <span className="font-mono">{Math.round(l.confidence * 100)}% confidence</span>
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
            <p className="py-12 text-center text-body-s text-text-3">
              No stats yet. Once your posts are published and their stats come
              in, the before-and-after chart shows here.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--text-3)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      color: "var(--text)",
                    }}
                  />
                  {analyzerBoundary && (
                    <ReferenceLine
                      x={analyzerBoundary}
                      stroke="var(--accent)"
                      strokeDasharray="3 3"
                      label={{ value: "Learnings on", fill: "var(--accent)", fontSize: 11 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="x"
                    stroke="var(--teal)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="X"
                  />
                  <Line
                    type="monotone"
                    dataKey="linkedin"
                    stroke="var(--text-2)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="LinkedIn"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {analyzerRunAt && (
            <p className="mt-3 text-body-s text-text-3">
              Last checked {new Date(analyzerRunAt).toLocaleString()}. Posts
              after this point were written using these learnings.
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
