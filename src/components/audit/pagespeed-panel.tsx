"use client";

import { Smartphone, Monitor, Zap } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
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
      ? "var(--teal)"
      : tone === "warning"
      ? "var(--accent)"
      : tone === "error"
      ? "var(--danger)"
      : "var(--text-3)";
  const pct = score ?? 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--surface-2)"
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
            transform="rotate(-90 60 60)"
            className="transition-all duration-700"
          />
        </svg>
        <span className="text-numeric text-xl text-text">
          {score ?? "–"}
        </span>
      </div>
      <span className="text-caption text-text-3">{label}</span>
    </div>
  );
}

function Metric({
  label,
  code,
  value,
}: {
  label: string;
  code: string;
  value: string | null;
}) {
  return (
    <div className="rounded-md border border-line bg-ground px-3 py-2">
      <p className="flex items-baseline justify-between gap-2 text-caption text-text-3">
        <span>{label}</span>
        <span className="font-mono">{code}</span>
      </p>
      <p className="mt-0.5 font-mono text-body-s text-text">
        {value ?? "Not measured"}
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
      <div className="rounded-md border border-dashed border-line p-4">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-4 w-4 text-text-3" />
          <h4 className="text-title text-text-2">{title}</h4>
        </div>
        <p className="text-body-s text-text-3">Google couldn&apos;t measure this one.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-3" />
        <h4 className="text-title text-text">{title}</h4>
      </div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <ScoreRing score={metrics.performanceScore} label="Speed" />
        <ScoreRing score={metrics.seoScore} label="Search" />
        <ScoreRing score={metrics.accessibilityScore} label="Access" />
        <ScoreRing score={metrics.bestPracticesScore} label="Build" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Main content shows" code="LCP" value={metrics.lcp} />
        <Metric label="First paint" code="FCP" value={metrics.fcp} />
        <Metric label="Layout shift" code="CLS" value={metrics.cls} />
        <Metric label="Blocked time" code="TBT" value={metrics.tbt} />
        {metrics.inp && (
          <Metric label="Reacts to clicks" code="INP" value={metrics.inp} />
        )}
        {metrics.speedIndex && (
          <Metric label="Visual speed" code="SI" value={metrics.speedIndex} />
        )}
      </div>
      {metrics.opportunities.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-label text-text-3">Biggest time savers</p>
          <ul className="space-y-1.5">
            {metrics.opportunities.slice(0, 3).map((opp) => (
              <li
                key={opp.id}
                className="flex items-start justify-between gap-3 text-body-s"
              >
                <span className="text-text-2">{opp.title}</span>
                <Badge variant="success">
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
      <div className="mb-2 flex items-center gap-2">
        <Zap className="h-5 w-5 text-text-3" />
        <h3 className="text-heading text-text">How fast your site loads</h3>
      </div>
      <p className="mb-5 text-body-s text-text-2">
        Measured by Google on real phones and computers. Each score is out of
        100: 90 or more is good, 50 to 89 needs work, below 50 is poor.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StrategyBlock metrics={data.mobile} icon={Smartphone} title="On phones" />
        <StrategyBlock metrics={data.desktop} icon={Monitor} title="On computers" />
      </div>
    </Card>
  );
}
