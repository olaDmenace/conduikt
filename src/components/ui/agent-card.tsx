import * as React from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/badge";
import { agentDisplay } from "@/src/lib/ai/agents/display";
import type { AgentDefinition } from "@/src/lib/ai/agents/registry";

// docs/DESIGN.md §Components · Agent card. The whole card is the link —
// no inner button. Locked agents show the tier chip and "Unlock", never a
// faded 60% opacity treatment.
const TIER_LABEL: Record<AgentDefinition["tier"], string> = {
  free: "Free",
  pro: "Pro",
  growth: "Growth",
  agency: "Agency",
};

export function AgentCard({
  agent,
  href,
  locked = false,
  lastUsed,
}: {
  agent: AgentDefinition;
  href: string;
  locked?: boolean;
  lastUsed?: string;
}) {
  const { name, job } = agentDisplay(agent);
  return (
    <Link
      href={locked ? "/settings/billing" : href}
      className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3.5 text-sm transition-colors duration-[var(--duration-fast)] hover:border-accent"
    >
      <span className="flex items-center justify-between gap-2">
        <Badge variant={agent.tier}>{TIER_LABEL[agent.tier]}</Badge>
        {locked && <span className="text-caption font-medium text-accent-hover">Unlock</span>}
      </span>
      <span className="text-title text-text">{name}</span>
      <span className="text-body-s text-text-2">{job}</span>
      {lastUsed && <span className="text-caption text-text-3">Last used {lastUsed}</span>}
    </Link>
  );
}
