"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Settings,
  Loader2,
  ArrowUpRight,
  FileText,
  Search,
  Target,
  PenTool,
  Smartphone,
  Mail,
  Map,
  Flag,
  Key,
  TrendingUp,
  Lock,
  Zap,
  Calendar,
  GitBranch,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { cn } from "@/src/lib/utils/cn";
import { AGENT_REGISTRY, type AgentDefinition } from "@/src/lib/ai/agents/registry";
import type { AgentMetrics } from "@/src/app/api/projects/[id]/agent-metrics/route";

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Search,
  Target,
  PenTool,
  Smartphone,
  Mail,
  Map,
  Flag,
  FileText,
  Key,
  TrendingUp,
  Zap,
  Calendar,
  GitBranch,
};

interface Project {
  id: string;
  name: string;
  website_url: string | null;
  onboarding_completed?: boolean | null;
}

type MetricsMap = Record<string, AgentMetrics & { lastUsedLabel: string | null }>;

function AgentCard({
  agent,
  projectId,
  metrics,
  delay,
}: {
  agent: AgentDefinition;
  projectId: string;
  metrics?: AgentMetrics & { lastUsedLabel: string | null };
  delay: number;
}) {
  const IconComp = ICON_MAP[agent.icon] ?? FileText;
  const isComingSoon = agent.status === "coming_soon";
  const href = isComingSoon
    ? "#"
    : `/projects/${projectId}/agents/${agent.route}`;

  const isUnused = !metrics?.lastUsedLabel && !isComingSoon;

  return (
    <div
      className={cn(
        "animate-in group relative flex flex-col rounded-xl border bg-surface-1 p-5 transition-all duration-200",
        isComingSoon
          ? "opacity-50 cursor-not-allowed border-border-default"
          : "border-border-default hover:border-border-strong hover:shadow-elevated hover:scale-[1.01] cursor-pointer"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Agent icon + name */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              isComingSoon
                ? "bg-surface-2 text-text-tertiary"
                : "bg-accent-muted text-accent group-hover:bg-accent/20"
            )}
          >
            {isComingSoon ? (
              <Lock className="h-4 w-4" />
            ) : (
              <IconComp className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-body font-semibold text-text-primary leading-tight">
              {agent.name}
            </p>
            <p className="text-caption text-text-tertiary mt-0.5">
              {agent.category}
            </p>
          </div>
        </div>
        {isComingSoon && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            Soon
          </Badge>
        )}
        {!isComingSoon && agent.tier !== "free" && (
          <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">
            {agent.tier}+
          </Badge>
        )}
      </div>

      {/* Metrics */}
      <div className="flex-1 mb-4">
        <p className="text-small text-text-secondary leading-snug">
          {agent.description}
        </p>
        {!isComingSoon && metrics && (
          <div className="mt-3 space-y-1">
            {metrics.primary && (
              <p
                className={cn(
                  "text-body font-semibold font-mono",
                  isUnused ? "text-text-tertiary" : "text-text-primary"
                )}
              >
                {metrics.primary}
              </p>
            )}
            {metrics.secondary && (
              <p className="text-caption text-success">{metrics.secondary}</p>
            )}
            {metrics.lastUsedLabel && (
              <p className="text-caption text-text-tertiary">
                Last used {metrics.lastUsedLabel}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      {!isComingSoon && (
        <Link
          href={href}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-small font-medium transition-all",
            "border-border-default text-text-secondary",
            "group-hover:border-accent group-hover:text-accent group-hover:bg-accent-muted"
          )}
        >
          {agent.ctaLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [metrics, setMetrics] = useState<MetricsMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [projectRes, metricsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/agent-metrics`),
      ]);
      if (projectRes.ok) setProject(await projectRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      setLoading(false);
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-h2 text-text-primary">Project not found</h2>
        <Button className="mt-4" asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const activeAgents = AGENT_REGISTRY.filter((a) => a.status === "active");
  const comingSoonAgents = AGENT_REGISTRY.filter(
    (a) => a.status === "coming_soon"
  );

  // Quick stats from SEO audit metrics
  const seoMetrics = metrics?.["seo-audit"];
  const totalAssets = Object.values(metrics ?? {}).reduce((sum, m) => {
    const primary = m?.primary ?? "";
    const match = primary.match(/^(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.website_url ?? "AI Marketing Command Center"}
      >
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/projects/${id}/settings`}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </Button>
      </PageHeader>

      {/* Onboarding banner */}
      {!project.onboarding_completed && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-accent/30 bg-accent-muted/20 mb-6 animate-in">
          <div className="flex-1">
            <p className="text-body font-semibold text-text-primary">
              Complete your brand profile to unlock AI-powered features
            </p>
            <p className="text-small text-text-secondary mt-0.5">
              Help Conduikt understand your business, audience, and goals so every piece of content is tailored to you.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href={`/projects/${id}/onboarding`}>
              Set up profile
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Quick stats strip */}
      <div className="flex items-center gap-6 px-5 py-3 rounded-xl border border-border-default bg-surface-1 mb-8 animate-in overflow-x-auto">
        <div className="shrink-0">
          <p className="text-caption text-text-tertiary">SEO Score</p>
          <p className="text-body font-bold font-mono text-text-primary">
            {seoMetrics?.primary ?? "—"}
          </p>
        </div>
        {seoMetrics?.secondary && (
          <div className="shrink-0">
            <p className="text-caption text-text-tertiary">Change</p>
            <p className="text-body font-medium text-success">
              {seoMetrics.secondary}
            </p>
          </div>
        )}
        <div className="shrink-0">
          <p className="text-caption text-text-tertiary">Total Activity</p>
          <p className="text-body font-bold font-mono text-text-primary">
            {totalAssets} pieces
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <Link
            href={`/projects/${id}/analytics`}
            className="text-small text-accent hover:text-accent-hover transition-colors"
          >
            View Analytics →
          </Link>
        </div>
      </div>

      {/* Active Agents */}
      <div className="mb-3">
        <p className="text-caption text-text-tertiary tracking-wider uppercase px-1">
          Your Agents
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {activeAgents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            projectId={id}
            metrics={metrics?.[agent.id]}
            delay={i * 50}
          />
        ))}
      </div>

      {/* Coming Soon */}
      {comingSoonAgents.length > 0 && (
        <>
          <div className="mb-3">
            <p className="text-caption text-text-tertiary tracking-wider uppercase px-1">
              Coming Soon
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoonAgents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                projectId={id}
                metrics={undefined}
                delay={(activeAgents.length + i) * 50}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
