"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";

interface CampaignStep {
  id: string;
  step_order: number;
  agent_id: string;
  status: string;
  result: unknown;
  started_at: string | null;
  completed_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  campaign_steps: CampaignStep[];
}

interface CampaignRunnerProps {
  campaign: Campaign;
  projectId: string;
  onUpdate: () => void;
}

const statusConfig: Record<
  string,
  { icon: typeof Clock; color: string; label: string }
> = {
  pending: { icon: Clock, color: "text-text-tertiary", label: "Pending" },
  running: { icon: Loader2, color: "text-accent", label: "Running" },
  completed: { icon: CheckCircle2, color: "text-success", label: "Done" },
  failed: { icon: XCircle, color: "text-error", label: "Failed" },
  skipped: { icon: Clock, color: "text-text-tertiary", label: "Skipped" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatResultData(data: any): React.ReactNode {
  if (!data || typeof data !== "object") {
    return <p className="text-text-secondary text-sm">{String(data)}</p>;
  }

  // Variants (e.g. ad copy variants)
  if (Array.isArray(data.variants)) {
    return (
      <div className="space-y-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Variants ({data.variants.length})
        </h4>
        {data.variants.map((v: any, i: number) => (
          <div key={i} className="rounded-md bg-surface-1 p-3 border border-border-subtle">
            <span className="text-caption font-mono text-accent">#{i + 1}</span>
            <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">
              {v.text || v.content || v.copy || JSON.stringify(v, null, 2)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Posts (e.g. social media posts)
  if (Array.isArray(data.posts)) {
    return (
      <div className="space-y-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Posts ({data.posts.length})
        </h4>
        {data.posts.map((p: any, i: number) => (
          <div key={i} className="rounded-md bg-surface-1 p-3 border border-border-subtle">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-caption font-mono text-accent">#{i + 1}</span>
              {p.platform && (
                <Badge variant="secondary">{p.platform}</Badge>
              )}
            </div>
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {p.text || p.content || p.body || JSON.stringify(p, null, 2)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Emails
  if (Array.isArray(data.emails)) {
    return (
      <div className="space-y-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Emails ({data.emails.length})
        </h4>
        {data.emails.map((e: any, i: number) => (
          <div key={i} className="rounded-md bg-surface-1 p-3 border border-border-subtle">
            <span className="text-caption font-mono text-accent">#{i + 1}</span>
            <p className="text-sm font-medium text-text-primary mt-1">{e.subject || e.subject_line}</p>
            {(e.goal || e.objective) && (
              <p className="text-xs text-text-tertiary mt-0.5">Goal: {e.goal || e.objective}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Findings (e.g. audit/research results)
  if (Array.isArray(data.findings)) {
    return (
      <div className="space-y-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Findings ({data.findings.length})
        </h4>
        {data.findings.map((f: any, i: number) => (
          <div key={i} className="rounded-md bg-surface-1 p-3 border border-border-subtle">
            <span className="text-caption font-mono text-accent">#{i + 1}</span>
            <p className="text-sm font-medium text-text-primary mt-1">{f.title || f.name}</p>
            {(f.recommendation || f.description) && (
              <p className="text-xs text-text-tertiary mt-0.5">{f.recommendation || f.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Markdown content
  if (typeof data.content_markdown === "string") {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans bg-transparent p-0">
          {data.content_markdown}
        </pre>
      </div>
    );
  }

  // Content pillars
  if (Array.isArray(data.pillars)) {
    return (
      <div className="space-y-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Content Pillars ({data.pillars.length})
        </h4>
        {data.pillars.map((p: any, i: number) => (
          <div key={i} className="rounded-md bg-surface-1 p-3 border border-border-subtle">
            <span className="text-caption font-mono text-accent">#{i + 1}</span>
            <p className="text-sm font-medium text-text-primary mt-1">{p.topic || p.name || p.title}</p>
            {Array.isArray(p.content_pieces || p.pieces || p.items) && (
              <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
                {(p.content_pieces || p.pieces || p.items).map((piece: any, j: number) => (
                  <li key={j} className="text-xs text-text-secondary">
                    {piece.title || piece.name || String(piece)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Competitors
  if (Array.isArray(data.competitors)) {
    return (
      <div className="space-y-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Competitors ({data.competitors.length})
        </h4>
        {data.competitors.map((c: any, i: number) => (
          <div key={i} className="rounded-md bg-surface-1 p-3 border border-border-subtle">
            <span className="text-caption font-mono text-accent">#{i + 1}</span>
            <p className="text-sm font-medium text-text-primary mt-1">{c.name}</p>
            {c.strengths && (
              <p className="text-xs text-success mt-0.5">
                Strengths: {Array.isArray(c.strengths) ? c.strengths.join(", ") : c.strengths}
              </p>
            )}
            {c.weaknesses && (
              <p className="text-xs text-error mt-0.5">
                Weaknesses: {Array.isArray(c.weaknesses) ? c.weaknesses.join(", ") : c.weaknesses}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Default: prettified JSON
  return (
    <pre className="text-[0.75rem] text-text-secondary whitespace-pre-wrap font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className="h-7 px-2 text-text-tertiary hover:text-text-primary"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function CampaignRunner({
  campaign,
  projectId,
  onUpdate,
}: CampaignRunnerProps) {
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  async function handleRun() {
    setRunning(true);
    const res = await fetch(
      `/api/projects/${projectId}/campaigns/${campaign.id}/run`,
      { method: "POST" }
    );
    setRunning(false);
    if (res.ok) {
      onUpdate();
    }
  }

  const steps = campaign.campaign_steps.sort(
    (a, b) => a.step_order - b.step_order
  );
  const canRun =
    campaign.status === "draft" || campaign.status === "failed" || campaign.status === "completed";

  function toggleStep(stepId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-h3 text-text-primary">{campaign.name}</h3>
            <p className="text-small text-text-secondary">
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                campaign.status === "completed"
                  ? "success"
                  : campaign.status === "failed"
                  ? "error"
                  : campaign.status === "running"
                  ? "warning"
                  : "secondary"
              }
            >
              {campaign.status}
            </Badge>
            {canRun && (
              <Button size="sm" onClick={handleRun} disabled={running}>
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? "Running..." : "Run"}
              </Button>
            )}
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-2">
          {steps.map((step) => {
            const config =
              statusConfig[step.status] || statusConfig.pending;
            const Icon = config.icon;
            const def = AGENT_REGISTRY.find((a) => a.id === step.agent_id);
            const hasResult: boolean = !!(
              step.result &&
              typeof step.result === "object" &&
              Object.keys(step.result as object).length > 0
            );
            // Completed steps are expanded by default (not in collapsed set)
            const isExpanded = hasResult && !collapsed.has(step.id);
            const resultObj = step.result as Record<string, unknown> | null;
            const resultData = resultObj?.data ?? resultObj;
            const rawText =
              typeof step.result === "string"
                ? step.result
                : JSON.stringify(step.result, null, 2);
            // _savedAssets is the auto-save metadata appended by the
            // run handler when blog/social/email outputs land as
            // assets in the user's Library. Surface as a small badge
            // so users know where to find the publishable artifacts.
            const savedAssets = Array.isArray(
              (resultObj as { _savedAssets?: unknown })?._savedAssets
            )
              ? ((resultObj as { _savedAssets: Array<{ id: string; type: string; channel: string | null; title: string | null }> })._savedAssets)
              : [];

            return (
              <div
                key={step.id}
                className="rounded-lg border border-border-default bg-surface-0"
              >
                <button
                  onClick={() => hasResult && toggleStep(step.id)}
                  className="flex items-center gap-3 w-full p-3 text-left"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-caption font-mono text-text-secondary shrink-0">
                    {step.step_order}
                  </span>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${config.color} ${
                      step.status === "running" ? "animate-spin" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-body font-medium text-text-primary block">
                      {def?.name || step.agent_id}
                    </span>
                    {def?.description && (
                      <span className="text-xs text-text-tertiary block truncate">
                        {def.description}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={
                      step.status === "completed"
                        ? "success"
                        : step.status === "failed"
                        ? "error"
                        : step.status === "running"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {config.label}
                  </Badge>
                  {hasResult ? (
                    isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-text-tertiary shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
                    )
                  ) : null}
                </button>
                {isExpanded && hasResult && (
                  <div className="px-3 pb-3 border-t border-border-subtle">
                    {savedAssets.length > 0 && (
                      <div className="mt-2 rounded-md border border-success/30 bg-success/5 px-3 py-2">
                        <p className="text-small text-text-primary font-medium">
                          ✓ Saved {savedAssets.length}{" "}
                          {savedAssets.length === 1 ? "item" : "items"} to Library
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {savedAssets[0].type === "blog_post"
                            ? "Blog post draft"
                            : savedAssets[0].type === "social_post"
                              ? `${savedAssets.length} social posts`
                              : savedAssets[0].type === "email"
                                ? `${savedAssets.length} emails`
                                : "Drafts"}{" "}
                          ready to review and schedule.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2 mb-1">
                      <CopyButton text={rawText} />
                    </div>
                    <div className="overflow-y-auto max-h-[500px] bg-surface-2 rounded-lg p-3">
                      {typeof step.result === "string" ? (
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {step.result}
                        </p>
                      ) : (
                        formatResultData(resultData)
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
