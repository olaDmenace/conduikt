"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CalendarPlus,
  ExternalLink,
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";
import { agentDisplay } from "@/src/lib/ai/agents/display";
import { useToast } from "@/src/components/ui/toast";

interface SavedAsset {
  id: string;
  type: string;
  channel: string | null;
  title: string | null;
  postText?: string;
}

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
  pending: { icon: Clock, color: "text-text-3", label: "Waiting" },
  running: { icon: Clock, color: "text-accent", label: "Running" },
  completed: { icon: CheckCircle2, color: "text-teal", label: "Done" },
  failed: { icon: XCircle, color: "text-danger", label: "Failed" },
  skipped: { icon: Clock, color: "text-text-3", label: "Skipped" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatResultData(data: any): React.ReactNode {
  if (!data || typeof data !== "object") {
    return <p className="text-body-s text-text-2">{String(data)}</p>;
  }

  // Variants (e.g. ad copy variants)
  if (Array.isArray(data.variants)) {
    return (
      <div className="space-y-3">
        <h4 className="text-label text-text-3">
          Variants ({data.variants.length})
        </h4>
        {data.variants.map((v: any, i: number) => (
          <div key={i} className="rounded-md bg-surface p-3 border border-line">
            <span className="font-mono text-caption text-text-3">#{i + 1}</span>
            <p className="mt-1 whitespace-pre-wrap text-body-s text-text">
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
        <h4 className="text-label text-text-3">
          Posts ({data.posts.length})
        </h4>
        {data.posts.map((p: any, i: number) => (
          <div key={i} className="rounded-md bg-surface p-3 border border-line">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-caption text-text-3">#{i + 1}</span>
              {p.platform && (
                <Badge variant="secondary">{p.platform}</Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap text-body-s text-text">
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
        <h4 className="text-label text-text-3">
          Emails ({data.emails.length})
        </h4>
        {data.emails.map((e: any, i: number) => (
          <div key={i} className="rounded-md bg-surface p-3 border border-line">
            <span className="font-mono text-caption text-text-3">#{i + 1}</span>
            <p className="mt-1 text-title text-text">{e.subject || e.subject_line}</p>
            {(e.goal || e.objective) && (
              <p className="mt-0.5 text-caption text-text-3">Goal: {e.goal || e.objective}</p>
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
        <h4 className="text-label text-text-3">
          Findings ({data.findings.length})
        </h4>
        {data.findings.map((f: any, i: number) => (
          <div key={i} className="rounded-md bg-surface p-3 border border-line">
            <span className="font-mono text-caption text-text-3">#{i + 1}</span>
            <p className="mt-1 text-title text-text">{f.title || f.name}</p>
            {(f.recommendation || f.description) && (
              <p className="mt-0.5 text-caption text-text-3">{f.recommendation || f.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Markdown content
  if (typeof data.content_markdown === "string") {
    return (
      <pre className="whitespace-pre-wrap bg-transparent p-0 font-sans text-body-s text-text">
        {data.content_markdown}
      </pre>
    );
  }

  // Content pillars
  if (Array.isArray(data.pillars)) {
    return (
      <div className="space-y-3">
        <h4 className="text-label text-text-3">
          Content themes ({data.pillars.length})
        </h4>
        {data.pillars.map((p: any, i: number) => (
          <div key={i} className="rounded-md bg-surface p-3 border border-line">
            <span className="font-mono text-caption text-text-3">#{i + 1}</span>
            <p className="mt-1 text-title text-text">{p.topic || p.name || p.title}</p>
            {Array.isArray(p.content_pieces || p.pieces || p.items) && (
              <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
                {(p.content_pieces || p.pieces || p.items).map((piece: any, j: number) => (
                  <li key={j} className="text-caption text-text-2">
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
        <h4 className="text-label text-text-3">
          Competitors ({data.competitors.length})
        </h4>
        {data.competitors.map((c: any, i: number) => (
          <div key={i} className="rounded-md bg-surface p-3 border border-line">
            <span className="font-mono text-caption text-text-3">#{i + 1}</span>
            <p className="mt-1 text-title text-text">{c.name}</p>
            {c.strengths && (
              <p className="mt-0.5 text-caption text-teal">
                Strengths: {Array.isArray(c.strengths) ? c.strengths.join(", ") : c.strengths}
              </p>
            )}
            {c.weaknesses && (
              <p className="mt-0.5 text-caption text-danger">
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
    <pre className="whitespace-pre-wrap font-mono text-caption text-text-2">
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
      className="h-7 px-2 text-text-3 hover:text-text"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-teal" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="text-caption">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

// Inline action panel rendered for each step's auto-saved assets.
// For social_posts: a Schedule button that opens a small inline date
// picker and POSTs to /api/projects/[id]/schedule. For blog_post and
// email: a link that takes the user to the asset detail page where
// they can edit and publish.
function SavedAssetsPanel({
  assets,
  projectId,
}: {
  assets: SavedAsset[];
  projectId: string;
}) {
  const { toast } = useToast();
  const [openSchedulerFor, setOpenSchedulerFor] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  async function handleSchedule(asset: SavedAsset) {
    if (!asset.postText) {
      toast("The post text is missing. Open it to schedule it yourself.", "error");
      return;
    }
    if (!scheduledAt) {
      toast("Pick a date and time first.", "error");
      return;
    }
    const channel = asset.channel === "linkedin" ? "linkedin" : "x";
    if (asset.channel !== "x" && asset.channel !== "linkedin") {
      toast(
        `We can't schedule to ${asset.channel} yet. Only X and LinkedIn post on their own.`,
        "error"
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          channel,
          scheduledFor: new Date(scheduledAt).toISOString(),
          postText: asset.postText,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(body.error || "Couldn't schedule. Try again.", "error");
        return;
      }
      setScheduledIds((prev) => new Set(prev).add(asset.id));
      setOpenSchedulerFor(null);
      setScheduledAt("");
      toast(
        `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        "success"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const heading =
    assets[0]?.type === "blog_post"
      ? "Blog post draft saved"
      : assets[0]?.type === "social_post"
        ? `${assets.length} social ${assets.length === 1 ? "post" : "posts"} saved`
        : assets[0]?.type === "email"
          ? `${assets.length} ${assets.length === 1 ? "email" : "emails"} saved`
          : `${assets.length} drafts saved`;

  return (
    <div className="mt-2 space-y-2 rounded-md bg-teal-soft p-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
        <p className="text-title text-text">{heading}</p>
      </div>
      <ul className="space-y-1.5">
        {assets.map((asset) => {
          const isScheduled = scheduledIds.has(asset.id);
          const showScheduler = openSchedulerFor === asset.id;
          const channelLabel =
            asset.channel === "x"
              ? "X"
              : asset.channel === "linkedin"
                ? "LinkedIn"
                : asset.channel === "facebook"
                  ? "Facebook"
                  : asset.channel === "email"
                    ? "Email"
                    : asset.channel ?? "";

          return (
            <li
              key={asset.id}
              className="flex flex-col gap-2 rounded-md border border-line bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-s text-text truncate flex-1 min-w-0">
                  {asset.title || "Untitled"}
                </span>
                {channelLabel && (
                  <Badge variant="secondary">{channelLabel}</Badge>
                )}
                {isScheduled ? (
                  <span className="flex items-center gap-1 text-caption font-medium text-teal">
                    <Check className="h-3 w-3" />
                    Scheduled
                  </span>
                ) : asset.type === "social_post" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setOpenSchedulerFor(showScheduler ? null : asset.id)
                    }
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    {showScheduler ? "Cancel" : "Schedule"}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/projects/${projectId}/assets/${asset.id}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Link>
                  </Button>
                )}
              </div>
              {showScheduler && !isScheduled && asset.type === "social_post" && (
                <div className="flex items-center gap-2 border-t border-line pt-2">
                  <label htmlFor={`schedule-${asset.id}`} className="sr-only">
                    Date and time
                  </label>
                  <input
                    id={`schedule-${asset.id}`}
                    type="datetime-local"
                    min={minDateTime}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-8 flex-1 rounded-md border border-line-strong bg-surface px-2.5 text-body-s text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSchedule(asset)}
                    disabled={submitting || !scheduledAt}
                  >
                    {submitting ? "Scheduling…" : "Confirm"}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-title text-text">{campaign.name}</h3>
            <p className="text-body-s text-text-2">
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
              {campaign.status === "running" && (
                <span className="live-dot" aria-hidden />
              )}
              {campaign.status}
            </Badge>
            {canRun && (
              <Button size="sm" onClick={handleRun} disabled={running}>
                {!running && <Play className="h-4 w-4" />}
                {running ? "Running…" : "Run"}
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
                className="rounded-md border border-line bg-ground"
              >
                <button
                  onClick={() => hasResult && toggleStep(step.id)}
                  aria-expanded={hasResult ? isExpanded : undefined}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-caption text-text-2">
                    {step.step_order}
                  </span>
                  {step.status === "running" ? (
                    <span className="live-dot shrink-0" aria-hidden />
                  ) : (
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block text-title text-text">
                      {def ? agentDisplay(def).name : step.agent_id}
                    </span>
                    {def && (
                      <span className="block truncate text-caption text-text-3">
                        {agentDisplay(def).job}
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
                      <ChevronUp className="h-4 w-4 text-text-3 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-3 shrink-0" />
                    )
                  ) : null}
                </button>
                {isExpanded && hasResult && (
                  <div className="px-3 pb-3 border-t border-line">
                    {savedAssets.length > 0 && (
                      <SavedAssetsPanel
                        assets={savedAssets}
                        projectId={projectId}
                      />
                    )}
                    <div className="flex items-center justify-end mt-2 mb-1">
                      <CopyButton text={rawText} />
                    </div>
                    <div className="max-h-[500px] overflow-y-auto rounded-md border border-line bg-surface p-3">
                      {typeof step.result === "string" ? (
                        <p className="whitespace-pre-wrap text-body-s text-text">
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
      </div>
    </Card>
  );
}
