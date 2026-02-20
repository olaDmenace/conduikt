"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
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

export function CampaignRunner({
  campaign,
  projectId,
  onUpdate,
}: CampaignRunnerProps) {
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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
            const isExpanded = expanded === step.id;
            const hasResult: boolean = !!(
              step.result &&
              typeof step.result === "object" &&
              Object.keys(step.result as object).length > 0
            );

            return (
              <div
                key={step.id}
                className="rounded-lg border border-border-default bg-surface-0"
              >
                <button
                  onClick={() =>
                    setExpanded(isExpanded ? null : step.id)
                  }
                  className="flex items-center gap-3 w-full p-3 text-left"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-caption font-mono text-text-secondary">
                    {step.step_order}
                  </span>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${config.color} ${
                      step.status === "running" ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-body text-text-primary flex-1">
                    {def?.name || step.agent_id}
                  </span>
                  <span className={`text-small ${config.color}`}>
                    {config.label}
                  </span>
                  {hasResult ? (
                    isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-tertiary" />
                    )
                  ) : null}
                </button>
                {isExpanded && hasResult && (
                  <div className="px-3 pb-3 border-t border-border-subtle">
                    <pre className="mt-2 text-[0.75rem] text-text-secondary overflow-x-auto max-h-48 whitespace-pre-wrap font-mono bg-surface-2 rounded-lg p-3">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
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
