"use client";

import Link from "next/link";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import type { AgentDefinition } from "@/src/lib/ai/agents/registry";
import { tierLabel, type PlanTier } from "@/src/lib/plans";

const AGENT_PREVIEWS: Record<string, string[]> = {
  "page-cro": [
    "Hero CTA lacks urgency — conversion-lift est. +18%",
    "Form has 7 fields; reducing to 3 could lift sign-ups ~25%",
    "Above-the-fold value prop isn't audience-specific",
  ],
  copywriting: [
    "Landing hero variant A — benefit-led",
    "Landing hero variant B — outcome-led",
    "Email subject lines (5 variants)",
  ],
  "email-sequence": [
    "Welcome (Day 0) — warm intro + single CTA",
    "Nurture (Day 3) — case study + social proof",
    "Launch (Day 7) — time-boxed offer",
  ],
  "content-strategy": [
    "30-day calendar across 4 themes",
    "Priority topics ranked by search intent",
    "Cross-channel repurposing map",
  ],
  "competitor-analysis": [
    "Positioning gap: pricing transparency",
    "Content gap: no mid-funnel comparison posts",
    "Tone gap: competitors sound corporate — you can win on voice",
  ],
  "blog-post": [
    "SEO-optimized 1,500-word post with H-structure",
    "Meta title + description",
    "Internal link suggestions",
  ],
  "growth-playbook": [
    "30/60/90-day prioritized actions",
    "Channel mix recommendation",
    "Leading indicators to track",
  ],
  campaigns: [
    "4-step audit → strategy → content → publish flow",
    "Auto-chains agents based on your project context",
    "Scheduled releases across X + LinkedIn",
  ],
  calendar: [
    "Drag-and-drop monthly publishing view",
    "Status tracking (draft → scheduled → published)",
    "Channel-level filtering",
  ],
  "video-ad": [
    "AI presenter script + shot list",
    "Short-form format (15–30s)",
    "Caption overlay auto-generated",
  ],
  "ab-test-setup": [
    "Variant generator with null-hypothesis framing",
    "Sample-size guidance based on traffic",
    "Winner detection workflow",
  ],
  "client-reports": [
    "White-label PDF with client logo + brand color",
    "SEO, content, and publishing metrics rolled up",
    "Executive summary section auto-written",
  ],
};

function getPreview(agentId: string): string[] {
  return (
    AGENT_PREVIEWS[agentId] ?? [
      "Actionable insights tailored to your project",
      "Specific fixes, not generic best-practice lists",
      "Save, export, or publish in one click",
    ]
  );
}

interface LockedAgentModalProps {
  agent: AgentDefinition | null;
  onOpenChange: (open: boolean) => void;
}

export function LockedAgentModal({ agent, onOpenChange }: LockedAgentModalProps) {
  const open = agent !== null;
  const comingSoon = agent?.status === "coming_soon";
  const tier = (agent?.tier ?? "pro") as PlanTier;
  const preview = agent ? getPreview(agent.id) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {agent && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary">
                  <Lock className="h-3 w-3" />
                  {comingSoon ? "Coming soon" : tierLabel(tier)}
                </Badge>
                <Badge variant="secondary">{agent.category}</Badge>
              </div>
              <DialogTitle>{agent.name}</DialogTitle>
              <DialogDescription>{agent.description}</DialogDescription>
            </DialogHeader>

            <div className="mt-2 rounded-lg border border-dashed border-accent/40 bg-accent-muted/20 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-caption uppercase tracking-wide text-accent font-semibold">
                  Preview
                </span>
              </div>
              <ul className="space-y-2">
                {preview.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-small text-text-secondary"
                  >
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-accent shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-small text-text-secondary flex-1">
                {comingSoon
                  ? "This agent is launching soon. You'll be notified when it's available."
                  : `Upgrade to ${tierLabel(tier)} to unlock ${agent.shortName} and the full suite.`}
              </p>
              {!comingSoon && (
                <Button asChild size="sm">
                  <Link href="/settings/billing" onClick={() => onOpenChange(false)}>
                    Upgrade
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
