"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

interface ScoreResult {
  scores: {
    readability: number;
    seoFit: number | null;
    engagementPotential: number;
    overall: number;
  };
  suggestions: string[];
  verdict: "publish" | "improve" | "rewrite";
}

interface ContentScorePanelProps {
  content: string;
  contentType: "blog" | "social" | "copy" | "email";
  targetKeyword?: string;
  channel?: "x" | "linkedin";
  projectId: string;
  onImprove?: (suggestions: string[]) => void;
}

function ScoreGauge({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 75 ? "#4ADE80" : score >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-1.5">
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
      <div
        className="absolute font-mono font-semibold text-text-primary"
        style={{ fontSize: size * 0.22 }}
      >
        {score}
      </div>
      <span className="text-caption text-text-tertiary">{label}</span>
    </div>
  );
}

export function ContentScorePanel({
  content,
  contentType,
  targetKeyword,
  channel,
  projectId,
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
          body: JSON.stringify({ content, contentType, targetKeyword, channel, projectId }),
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
  }, [content, contentType, targetKeyword, channel, projectId]);

  if (!content || content.length < 50) return null;

  if (loading) {
    return (
      <Card className="animate-in mt-4">
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
          <span className="text-small text-text-secondary">Scoring content quality...</span>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const verdictConfig = {
    publish: { label: "Ready to Publish", variant: "success" as const, color: "text-success" },
    improve: { label: "Could be Stronger", variant: "warning" as const, color: "text-warning" },
    rewrite: { label: "Needs Rework", variant: "error" as const, color: "text-error" },
  };

  const v = verdictConfig[result.verdict];

  return (
    <Card className="animate-in mt-4">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-medium text-text-primary">Content Quality Score</h3>
          <Badge variant={v.variant === "error" ? "secondary" : v.variant === "warning" ? "secondary" : "success"}>
            {v.label}
          </Badge>
        </div>

        {/* Score Gauges */}
        <div className="flex items-center justify-center gap-8">
          <div className="relative flex flex-col items-center">
            <ScoreGauge score={result.scores.readability} label="Readability" />
          </div>
          {result.scores.seoFit !== null && (
            <div className="relative flex flex-col items-center">
              <ScoreGauge score={result.scores.seoFit} label="SEO Fit" />
            </div>
          )}
          <div className="relative flex flex-col items-center">
            <ScoreGauge score={result.scores.engagementPotential} label="Engagement" />
          </div>
          <div className="relative flex flex-col items-center">
            <ScoreGauge score={result.scores.overall} label="Overall" size={96} />
          </div>
        </div>

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {result.suggestions.length} suggestion{result.suggestions.length !== 1 ? "s" : ""}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1.5 pl-4">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-small text-text-secondary list-disc">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Improve Button */}
        {onImprove && result.verdict !== "publish" && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onImprove(result.suggestions)}
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
