"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

interface ScoreResult {
  total_score: number;
  clarity: number;
  relevance: number;
  engagement_potential: number;
  brand_alignment: number;
  summary: string;
  top_strength: string;
  top_improvement: string;
}

interface ContentScorePanelProps {
  content: string;
  contentType: string;
  projectId: string;
  postId?: string;
  onImprove?: (improvement: string) => void;
}

function ScoreGauge({
  score,
  maxScore,
  label,
  size = 72,
}: {
  score: number;
  maxScore: number;
  label: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score / maxScore;
  const offset = circumference - pct * circumference;
  const color = pct > 0.75 ? "#4ADE80" : pct >= 0.5 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-semibold text-text-primary"
            style={{ fontSize: size * 0.22 }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-caption text-text-tertiary text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export function ContentScorePanel({
  content,
  contentType,
  projectId,
  postId,
  onImprove,
}: ContentScorePanelProps) {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef("");

  useEffect(() => {
    if (!content || content.length < 50) return;
    if (content === lastContentRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      lastContentRef.current = content;
      setLoading(true);
      try {
        const res = await fetch("/api/ai/score-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, contentType, projectId, postId }),
        });
        if (res.ok) {
          setResult(await res.json());
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, contentType, projectId, postId]);

  if (!content || content.length < 50) return null;

  if (loading) {
    return (
      <Card className="animate-in mt-4">
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
          <span className="text-small text-text-secondary">
            Scoring content quality...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const verdict =
    result.total_score >= 75
      ? "publish"
      : result.total_score >= 50
        ? "improve"
        : "rewrite";

  const verdictConfig = {
    publish: { label: "Ready to Publish", variant: "success" as const },
    improve: { label: "Could be Stronger", variant: "warning" as const },
    rewrite: { label: "Needs Rework", variant: "secondary" as const },
  };

  const v = verdictConfig[verdict];

  return (
    <Card className="animate-in mt-4">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-medium text-text-primary">
            Content Quality Score
          </h3>
          <Badge variant={v.variant}>{v.label}</Badge>
        </div>

        {/* Score Gauges — 4 dimensions + total */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <ScoreGauge score={result.clarity} maxScore={25} label="Clarity" />
          <ScoreGauge
            score={result.relevance}
            maxScore={25}
            label="Relevance"
          />
          <ScoreGauge
            score={result.engagement_potential}
            maxScore={25}
            label="Engagement"
          />
          <ScoreGauge
            score={result.brand_alignment}
            maxScore={25}
            label="Brand Fit"
          />
          <ScoreGauge
            score={result.total_score}
            maxScore={100}
            label="Total"
            size={88}
          />
        </div>

        {/* Summary */}
        {result.summary && (
          <p className="text-small text-text-secondary text-center">
            {result.summary}
          </p>
        )}

        {/* Strengths & Improvements */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Details & improvement tip
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              {result.top_strength && (
                <div className="flex gap-2 text-small">
                  <span className="text-success shrink-0">Strength:</span>
                  <span className="text-text-secondary">
                    {result.top_strength}
                  </span>
                </div>
              )}
              {result.top_improvement && (
                <div className="flex gap-2 text-small">
                  <span className="text-warning shrink-0">Improve:</span>
                  <span className="text-text-secondary">
                    {result.top_improvement}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Improve Button */}
        {onImprove && verdict !== "publish" && result.top_improvement && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onImprove(result.top_improvement)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Improve with AI
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Small inline score badge for content lists */
export function ContentScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-success/20 text-success"
      : score >= 50
        ? "bg-warning/20 text-warning"
        : "bg-error/20 text-error";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-caption font-mono font-semibold ${color}`}
    >
      {score}
    </span>
  );
}
