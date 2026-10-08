"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Settings,
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
  ChevronDown,
  Microscope,
  Sparkles,
  Compass,
  Send,
  ListChecks,
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
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
  ListChecks,
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
    : `/projects/${projectId}/${agent.projectPath ?? agent.route}`;

  const isUnused = !metrics?.lastUsedLabel && !isComingSoon;

  return (
    <div
      className={cn(
        "animate-in group relative flex flex-col rounded-lg border border-line bg-surface p-5",
        isComingSoon
          ? "opacity-50 cursor-not-allowed"
          : "hover-card hover-card-quiet cursor-pointer"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Agent icon + name */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-text-3" aria-hidden>
            {isComingSoon ? (
              <Lock className="h-4 w-4" />
            ) : (
              <IconComp className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-title text-text">
              {agent.name}
            </p>
            <p className="text-caption text-text-3 mt-0.5">
              {agent.category}
            </p>
          </div>
        </div>
        {isComingSoon && (
          <Badge variant="secondary" className="shrink-0">
            Soon
          </Badge>
        )}
        {!isComingSoon && agent.tier !== "free" && (
          <Badge variant="secondary" className="shrink-0">
            {agent.tier}+
          </Badge>
        )}
      </div>

      {/* Metrics */}
      <div className="flex-1 mb-4">
        <p className="text-body-s text-text-2 leading-snug">
          {agent.description}
        </p>
        {!isComingSoon && metrics && (
          <div className="mt-3 space-y-1">
            {metrics.primary && (
              <p
                className={cn(
                  "text-numeric text-[22px]",
                  isUnused ? "text-text-3" : "text-text"
                )}
              >
                {metrics.primary}
              </p>
            )}
            {metrics.secondary && (
              <p className="text-caption text-teal">{metrics.secondary}</p>
            )}
            {metrics.lastUsedLabel && (
              <p className="text-caption text-text-3">
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
            "flex h-9 items-center justify-center gap-2 rounded-md border px-4 text-body-s font-medium transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)]",
            "border-line-strong text-text",
            "group-hover:border-accent group-hover:text-accent"
          )}
        >
          {agent.ctaLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Agent categories — drives the collapsible sections on the dashboard.
// Order here = order on the page. Labels are action-oriented so users
// know what each section delivers, not just an abstract noun.
// ---------------------------------------------------------------------
type CategoryId = AgentDefinition["category"];

interface CategoryMeta {
  id: CategoryId;
  label: string;
  description: string;
  icon: React.ElementType;
}

const AGENT_CATEGORIES: CategoryMeta[] = [
  {
    id: "analysis",
    label: "Audit and analyse",
    description: "Score your site, study competitors, find what's working",
    icon: Microscope,
  },
  {
    id: "creation",
    label: "Create content",
    description: "Write posts, emails, blogs and ads in your voice",
    icon: Sparkles,
  },
  {
    id: "strategy",
    label: "Plan",
    description: "Keywords, posting plan and launch plans",
    icon: Compass,
  },
  {
    id: "distribution",
    label: "Publish",
    description: "Schedule posts and run campaigns from start to finish",
    icon: Send,
  },
];

function AgentCategorySection({
  category,
  agents,
  projectId,
  metrics,
}: {
  category: CategoryMeta;
  agents: AgentDefinition[];
  projectId: string;
  metrics: MetricsMap | null;
}) {
  // Default-collapsed: the user explicitly asked for this so the page
  // isn't a wall of cards on first load. Per-category preference
  // persists in localStorage. Storage key is project-agnostic so the
  // setting applies across all projects — opening "Create Content" once
  // shouldn't re-collapse it next time.
  const storageKey = `dash:agents:cat:${category.id}:expanded`;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "1") setExpanded(true);
  }, [storageKey]);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // localStorage may be unavailable (private mode) — non-fatal.
      }
      return next;
    });
  }

  const HeaderIcon = category.icon;

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={`agent-cat-${category.id}`}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:bg-surface-2"
      >
        <HeaderIcon className="h-4 w-4 shrink-0 text-text-3" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-title text-text">
              {category.label}
            </p>
            <span className="text-caption text-text-3 font-mono">
              {agents.length}
            </span>
          </div>
          <p className="text-body-s text-text-3 truncate">
            {category.description}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-3 transition-transform shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div
          id={`agent-cat-${category.id}`}
          className="border-t border-line p-4 bg-ground"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                projectId={projectId}
                metrics={metrics?.[agent.id]}
                delay={i * 50}
              />
            ))}
          </div>
        </div>
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
      <div className="space-y-6" role="status" aria-label="Loading project">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-16 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-heading text-text">Project not found</h2>
        <Button className="mt-4" asChild>
          <Link href="/projects">Back to projects</Link>
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
        description={project.website_url ?? "Your marketing, in one place"}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${id}/settings`}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </Button>
      </PageHeader>

      {/* Onboarding banner */}
      {!project.onboarding_completed && (
        <div className="flex flex-wrap items-center gap-4 px-5 py-4 rounded-lg border border-accent bg-surface mb-6 animate-in">
          <div className="flex-1 min-w-[16rem]">
            <p className="text-title text-text">
              Finish your brand profile so every agent writes for you
            </p>
            <p className="text-body-s text-text-2 mt-0.5">
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
      <div className="flex items-center gap-6 px-5 py-3 rounded-lg border border-line bg-surface mb-8 animate-in overflow-x-auto">
        <div className="shrink-0 space-y-1">
          <p className="text-label text-text-3">Site score</p>
          <p className="text-body font-mono text-text">
            {seoMetrics?.primary ?? "Not run yet"}
          </p>
        </div>
        {seoMetrics?.secondary && (
          <div className="shrink-0 space-y-1">
            <p className="text-label text-text-3">Change</p>
            <p className="text-body font-mono text-teal">
              {seoMetrics.secondary}
            </p>
          </div>
        )}
        <div className="shrink-0 space-y-1">
          <p className="text-label text-text-3">Total activity</p>
          <p className="text-body font-mono text-text">
            {totalAssets} pieces
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <Link
            href={`/projects/${id}/analytics`}
            className="hover-link text-body-s text-accent hover:text-accent-hover"
          >
            View analytics →
          </Link>
        </div>
      </div>

      {/* Active Agents — grouped by category in collapsible sections so
          the dashboard isn't a wall of cards. Each category persists its
          expanded state in localStorage so the user's preference sticks
          across visits. */}
      <div className="mb-3">
        <p className="text-label text-text-3 px-1">
          Your agents
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {AGENT_CATEGORIES.map((cat) => {
          const agentsInCat = activeAgents.filter(
            (a) => a.category === cat.id
          );
          if (agentsInCat.length === 0) return null;
          return (
            <AgentCategorySection
              key={cat.id}
              category={cat}
              agents={agentsInCat}
              projectId={id}
              metrics={metrics}
            />
          );
        })}
      </div>

      {/* Coming Soon */}
      {comingSoonAgents.length > 0 && (
        <>
          <div className="mb-3">
            <p className="text-label text-text-3 px-1">
              Coming soon
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
