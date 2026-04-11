"use client";

import { Smartphone, Monitor, Zap } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

interface PageSpeedMetrics {
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  lcp: string | null;
  fcp: string | null;
  cls: string | null;
  inp: string | null;
  tbt: string | null;
  speedIndex: string | null;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savingsMs: number;
  }>;
}

export interface PageSpeedData {
  mobile: PageSpeedMetrics | null;
  desktop: PageSpeedMetrics | null;
  fetchedAt?: string;
}

function scoreTone(score: number | null): "success" | "warning" | "error" | "secondary" {
  if (score == null) return "secondary";
  if (score >= 90) return "success";
  if (score >= 50) return "warning";
  return "error";
}

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const tone = scoreTone(score);
  const colorVar =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
      ? "var(--warning)"
      : tone === "error"
      ? "var(--error)"
      : "var(--text-tertiary)";
  const pct = score ?? 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--border-default)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={colorVar}
            strokeWidth="10"
            strokeDasharray={`${(pct / 100) * 327} 327`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className="transition-all duration-700"
          />
        </svg>
        <span className="text-sm font-mono font-bold text-text-primary">
          {score ?? "—"}
        </span>
      </div>
      <span className="text-caption text-text-tertiary">{label}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-0 px-3 py-2">
      <p className="text-caption text-text-tertiary">{label}</p>
      <p className="text-small font-mono text-text-primary mt-0.5">
        {value ?? "—"}
      </p>
    </div>
  );
}

function StrategyBlock({
  metrics,
  icon: Icon,
  title,
}: {
  metrics: PageSpeedMetrics | null;
  icon: typeof Smartphone;
  title: string;
}) {
  if (!metrics) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-text-tertiary" />
          <h4 className="text-body font-medium text-text-secondary">{title}</h4>
        </div>
        <p className="text-small text-text-tertiary">Not available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-1 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-accent" />
        <h4 className="text-body font-medium text-text-primary">{title}</h4>
      </div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <ScoreRing score={metrics.performanceScore} label="Perf" />
        <ScoreRing score={metrics.seoScore} label="SEO" />
        <ScoreRing score={metrics.accessibilityScore} label="A11y" />
        <ScoreRing score={metrics.bestPracticesScore} label="Best" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="LCP" value={metrics.lcp} />
        <Metric label="FCP" value={metrics.fcp} />
        <Metric label="CLS" value={metrics.cls} />
        <Metric label="TBT" value={metrics.tbt} />
        {metrics.inp && <Metric label="INP" value={metrics.inp} />}
        {metrics.speedIndex && (
          <Metric label="Speed Index" value={metrics.speedIndex} />
        )}
      </div>
      {metrics.opportunities.length > 0 && (
        <div className="mt-4">
          <p className="text-caption text-text-tertiary mb-2">
            Top opportunities
          </p>
          <ul className="space-y-1.5">
            {metrics.opportunities.slice(0, 3).map((opp) => (
              <li
                key={opp.id}
                className="flex items-start justify-between gap-3 text-small"
              >
                <span className="text-text-secondary">{opp.title}</span>
                <Badge variant="secondary">
                  -{(opp.savingsMs / 1000).toFixed(1)}s
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PageSpeedPanel({ data }: { data: PageSpeedData }) {
  if (!data.mobile && !data.desktop) return null;

  return (
    <Card className="mb-8 animate-in">
      <CardContent className="py-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-accent" />
          <h3 className="text-h3 text-text-primary">Page Speed (Lighthouse)</h3>
        </div>
        <p className="text-small text-text-secondary mb-5">
          Real Core Web Vitals from Google PageSpeed Insights. Green is 90+,
          orange 50–89, red below 50.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrategyBlock
            metrics={data.mobile}
            icon={Smartphone}
            title="Mobile"
          />
          <StrategyBlock
            metrics={data.desktop}
            icon={Monitor}
            title="Desktop"
          />
        </div>
      </CardContent>
    </Card>
  );
}
