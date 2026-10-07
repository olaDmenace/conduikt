"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/src/components/ui/drawer";
import { AgentCard } from "@/src/components/ui/agent-card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Button } from "@/src/components/ui/button";
import { useUIStore } from "@/src/stores/ui-store";
import { createClient } from "@/src/lib/supabase/client";
import { AGENT_GROUPS, agentsInGroup } from "@/src/lib/ai/agents/display";
import { isPlanAtLeast, normalizePlan, type PlanTier } from "@/src/lib/plans";
import { cn } from "@/src/lib/utils/cn";
import Link from "next/link";

// docs/DESIGN.md §App architecture: every agent is rendered by ONE
// component. The rail's "Ask an agent to" groups, ⌘K and the prompt bar
// all open this picker (via useUIStore.openAgentPicker(group)).
export function AgentPicker() {
  const group = useUIStore((s) => s.agentPickerGroup);
  const open = useUIStore((s) => s.openAgentPicker);
  const close = useUIStore((s) => s.closeAgentPicker);
  const currentProjectId = useUIStore((s) => s.currentProjectId);
  const brief = useUIStore((s) => s.agentPickerBrief);
  const pathname = usePathname();
  const [plan, setPlan] = React.useState<PlanTier>("free");

  // Close when the user navigates (they picked an agent). A `?pick=<group>`
  // param (from the retired /playground and /agents redirects) opens it.
  React.useEffect(() => {
    const pick = new URLSearchParams(window.location.search).get("pick");
    if (pick && AGENT_GROUPS.some((g) => g.category === pick)) open(pick);
    else close();
  }, [pathname, close, open]);

  React.useEffect(() => {
    if (!group) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
      setPlan(normalizePlan(data?.plan));
    });
  }, [group]);

  const active = AGENT_GROUPS.find((g) => g.category === group) ?? AGENT_GROUPS[0];

  return (
    <Drawer open={group !== null} onClose={close} title="Ask an agent to">
      <div className="space-y-5">
        {brief && (
          <p className="rounded-md border border-line bg-ground px-3 py-2 text-body-s text-text-2">
            <span className="text-label text-text-3">Your request · </span>
            {brief}
          </p>
        )}
        <div role="tablist" aria-label="Agent groups" className="flex flex-wrap gap-1.5">
          {AGENT_GROUPS.map((g) => {
            const selected = g.category === active.category;
            return (
              <button
                key={g.category}
                role="tab"
                aria-selected={selected}
                onClick={() => open(g.category)}
                className={cn(
                  "h-8 rounded-md border px-3 text-[13px] transition-colors duration-[var(--duration-fast)]",
                  selected
                    ? "border-ink bg-ink text-ink-text"
                    : "border-line bg-surface text-text-2 hover:bg-surface-2"
                )}
              >
                {g.label} · {agentsInGroup(g.category).length}
              </button>
            );
          })}
        </div>

        {!currentProjectId ? (
          <EmptyState
            title="Agents work on a project. Add your website first."
            action={
              <Button asChild>
                <Link href="/projects/new">Add my website</Link>
              </Button>
            }
          />
        ) : (
          <div role="tabpanel" className="grid gap-2 sm:grid-cols-2">
            {agentsInGroup(active.category).map((agent) => {
              const locked =
                agent.status === "coming_soon" || !isPlanAtLeast(plan, agent.tier as PlanTier);
              return (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  locked={locked}
                  href={withBrief(`/projects/${currentProjectId}/${agent.projectPath ?? agent.route}`, brief)}
                />
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}

// Content Studio reads ?prompt=, the Blog agent reads ?topic=. Other agent
// pages ignore the param, which is harmless.
function withBrief(href: string, brief: string | null): string {
  if (!brief) return href;
  const key = /\/blog(\?|$)/.test(href) ? "topic" : "prompt";
  return `${href}${href.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(brief)}`;
}
