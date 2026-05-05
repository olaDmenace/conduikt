"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Sparkles,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  BarChart3,
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
  Video,
  FolderOpen,
  Swords,
  Webhook,
  Users,
  Send,
  CreditCard,
  Link2,
  Play,
  Lock,
  FileBarChart,
  Layers,
  Rocket,
} from "lucide-react";
import { cn } from "@/src/lib/utils/cn";
import { useUIStore } from "@/src/stores/ui-store";
import { createClient } from "@/src/lib/supabase/client";
import { signOutAction } from "@/src/app/(auth)/logout/action";
import { markSigningOut } from "@/src/lib/auth/signing-out";
import { AGENT_REGISTRY, type AgentDefinition } from "@/src/lib/ai/agents/registry";
import {
  getGenerationLimit,
  isPlanAtLeast,
  isUnlimited,
  normalizePlan,
  tierLabel,
  type PlanTier,
} from "@/src/lib/plans";
import { LockedAgentModal } from "@/src/components/agents/locked-agent-modal";

// Map Lucide icon names to components
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
  BarChart3,
  Video,
  FileBarChart,
  Layers,
  Rocket,
};

interface Project {
  id: string;
  name: string;
  website_url: string | null;
}

interface Profile {
  plan: string;
  generation_count: number;
}

// Show ALL agents in the sidebar (including agency-exclusive coming_soon
// Client Reports). Locked agents render dimmed with a tier badge — every
// login is a reminder of what the user could unlock.
const SIDEBAR_AGENTS = AGENT_REGISTRY;

// Sidebar agent category groupings — same labels + order as the project
// overview page. Section headers are visual-only (non-collapsible) here
// since the sidebar is already secondary nav; adding another click layer
// would feel tedious.
const SIDEBAR_AGENT_CATEGORIES: Array<{
  id: AgentDefinition["category"];
  label: string;
}> = [
  { id: "analysis", label: "Audit & Analyze" },
  { id: "creation", label: "Create Content" },
  { id: "strategy", label: "Plan & Strategy" },
  { id: "distribution", label: "Publish & Distribute" },
];

// Icon for the global Agents menu
const AgentsMenuIcon = Sparkles;

export function Sidebar() {
  const pathname = usePathname();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const expandedProjectIds = useUIStore((s) => s.expandedProjectIds);
  const toggleProjectExpanded = useUIStore((s) => s.toggleProjectExpanded);

  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agentsMenuOpen, setAgentsMenuOpen] = useState(false);
  const [lockedPreview, setLockedPreview] = useState<AgentDefinition | null>(null);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [projectsRes, profileRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, website_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("plan, generation_count")
          .eq("id", user.id)
          .single(),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (profileRes.data) setProfile(profileRes.data);
    }
    loadData();

    // Refetch profile when tab regains focus (e.g. after generation)
    function onVisibilityChange() {
      if (document.visibilityState === "visible") loadData();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Refetch when a generation completes (dispatched by content/playground pages)
    function onGeneration() { loadData(); }
    window.addEventListener("conduikt:generation", onGeneration);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("conduikt:generation", onGeneration);
    };
  }, [pathname]);

  async function handleLogout() {
    markSigningOut();
    setMobileMenuOpen(false);
    try {
      await signOutAction();
    } catch {
      // Non-fatal — the hard redirect below still runs and middleware
      // will bounce us to /login if the session somehow survived.
    }
    window.location.assign("/login");
  }

  function handleNavClick() {
    setMobileMenuOpen(false);
  }

  const showLabel = !sidebarCollapsed || mobileMenuOpen;
  const plan: PlanTier = normalizePlan(profile?.plan);
  const usageCount = profile?.generation_count ?? 0;
  const usageLimit = getGenerationLimit(plan);
  const usageUnlimited = isUnlimited(usageLimit);
  const usagePct = usageUnlimited ? 0 : Math.min((usageCount / usageLimit) * 100, 100);

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border-default bg-surface-0 transition-all duration-300",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-[260px]",
          "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4 shrink-0">
          {showLabel && (
            <Link
              href="/dashboard"
              className="flex items-center"
              onClick={handleNavClick}
            >
              <Image
                src="/conduikt-horizontal.png"
                alt="Conduikt"
                width={216}
                height={56}
                priority
                className="h-14 w-auto"
              />
            </Link>
          )}
          {!showLabel && (
            <Link
              href="/dashboard"
              className="mx-auto flex h-11 w-11 items-center justify-center"
            >
              <Image
                src="/conduikt-icon.png"
                alt="Conduikt"
                width={44}
                height={44}
                priority
                className="h-11 w-11"
              />
            </Link>
          )}
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {/* Dashboard */}
          <SidebarLink
            href="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === "/dashboard"}
            showLabel={showLabel}
            onClick={handleNavClick}
          />

          {/* Projects section */}
          {showLabel && (
            <Link
              href="/projects"
              onClick={handleNavClick}
              className="text-caption px-3 mt-5 mb-2 text-text-tertiary tracking-wider uppercase hover:text-text-secondary transition-colors block"
            >
              My Projects
            </Link>
          )}

          <div className="space-y-0.5">
            {projects.map((project) => {
              const isExpanded = expandedProjectIds.includes(project.id);
              const projectBase = `/projects/${project.id}`;
              const isInProject = pathname.startsWith(projectBase);

              return (
                <div key={project.id}>
                  {/* Project header */}
                  {showLabel ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleProjectExpanded(project.id)}
                        className={cn(
                          "flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] font-medium transition-colors min-w-0",
                          isInProject
                            ? "text-accent bg-accent-muted"
                            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                            isInProject
                              ? "bg-accent/20 text-accent"
                              : "bg-surface-3 text-text-tertiary"
                          )}
                        >
                          {project.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{project.name}</span>
                        <ChevronDown
                          className={cn(
                            "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    </div>
                  ) : (
                    // Collapsed: just show avatar
                    <button
                      onClick={() => toggleProjectExpanded(project.id)}
                      className={cn(
                        "flex w-full items-center justify-center rounded-lg p-2.5 text-[0.875rem] font-medium transition-colors",
                        isInProject
                          ? "bg-accent-muted text-accent"
                          : "text-text-secondary hover:bg-surface-2"
                      )}
                      title={project.name}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold bg-surface-3 text-text-tertiary">
                        {project.name.charAt(0).toUpperCase()}
                      </span>
                    </button>
                  )}

                  {/* Agent list — only visible when expanded + showLabel */}
                  {isExpanded && showLabel && (
                    <div className="ml-3 pl-3 border-l border-border-subtle mt-0.5 mb-1 space-y-0.5">
                      {/* Project tools (non-agent utility pages) */}
                      <ProjectSubLink href={`${projectBase}`} icon={BarChart3} label="Overview" pathname={pathname} exact onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/analytics`} icon={TrendingUp} label="Analytics" pathname={pathname} onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/competitors`} icon={Swords} label="Competitors" pathname={pathname} onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/emails`} icon={Mail} label="Email Sequences" pathname={pathname} onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/audiences`} icon={Users} label="Audiences" pathname={pathname} onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/forms`} icon={FileText} label="Forms" pathname={pathname} onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/broadcasts`} icon={Send} label="Broadcasts" pathname={pathname} onClick={handleNavClick} />

                      {/* Divider between project tools and agents */}
                      <div className="my-1.5 border-t border-border-subtle/60" />

                      {/* Agents (driven by registry) — grouped by category
                          with quiet section captions so the sidebar isn't a
                          17-item flat list. */}
                      {SIDEBAR_AGENT_CATEGORIES.map((cat) => {
                        const agentsInCat = SIDEBAR_AGENTS.filter(
                          (a) => a.category === cat.id
                        );
                        if (agentsInCat.length === 0) return null;
                        return (
                          <div key={cat.id} className="space-y-0.5">
                            <p className="px-2.5 pt-1.5 pb-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-text-tertiary/60">
                              {cat.label}
                            </p>
                            {agentsInCat.map((agent) => {
                              const path = agent.projectPath ?? agent.route;
                              const href = `${projectBase}/${path}`;
                              const hrefPath = href.split("?")[0];
                              const isActive =
                                pathname === hrefPath ||
                                pathname.startsWith(hrefPath + "/");
                              const IconComp = ICON_MAP[agent.icon] ?? FileText;
                              const unlocked = isPlanAtLeast(plan, agent.tier as PlanTier);
                              const comingSoon = agent.status === "coming_soon";
                              const locked = !unlocked || comingSoon;

                              if (locked) {
                                return (
                                  <button
                                    key={agent.id}
                                    type="button"
                                    onClick={() => setLockedPreview(agent)}
                                    title={
                                      comingSoon
                                        ? `${agent.name} — coming soon`
                                        : `${agent.name} — upgrade to ${tierLabel(agent.tier as PlanTier)}`
                                    }
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium text-text-tertiary/60 hover:bg-surface-2 hover:text-text-tertiary transition-colors text-left"
                                  >
                                    <IconComp className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate flex-1">{agent.shortName}</span>
                                    <span className="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-accent">
                                      <Lock className="h-2.5 w-2.5" />
                                      {comingSoon ? "Soon" : tierLabel(agent.tier as PlanTier)}
                                    </span>
                                  </button>
                                );
                              }

                              return (
                                <Link
                                  key={agent.id}
                                  href={href}
                                  onClick={handleNavClick}
                                  title={agent.description}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                                    isActive
                                      ? "bg-surface-2 text-accent"
                                      : "text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
                                  )}
                                >
                                  <IconComp className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{agent.shortName}</span>
                                </Link>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Divider between agents and project settings */}
                      <div className="my-1.5 border-t border-border-subtle/60" />

                      {/* Library & Settings — pinned to the bottom */}
                      <ProjectSubLink href={`${projectBase}/library`} icon={FolderOpen} label="Library" pathname={pathname} onClick={handleNavClick} />
                      <ProjectSubLink href={`${projectBase}/settings`} icon={Settings} label="Settings" pathname={pathname} onClick={handleNavClick} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* New Project button */}
            {showLabel && (
              <Link
                href="/projects/new"
                onClick={handleNavClick}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] font-medium text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Project</span>
              </Link>
            )}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-border-subtle" />

          {/* Global Agents menu */}
          {showLabel ? (
            <div>
              <button
                onClick={() => setAgentsMenuOpen((o) => !o)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-all duration-150",
                  pathname.startsWith("/agents")
                    ? "border-l-2 border-accent bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                )}
              >
                <AgentsMenuIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left">Agents</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    agentsMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {agentsMenuOpen && (
                <div className="ml-3 pl-3 border-l border-border-subtle mt-0.5 mb-1 space-y-0.5">
                  {SIDEBAR_AGENT_CATEGORIES.map((cat) => {
                    const agentsInCat = SIDEBAR_AGENTS.filter(
                      (a) => a.category === cat.id
                    );
                    if (agentsInCat.length === 0) return null;
                    return (
                      <div key={cat.id} className="space-y-0.5">
                        <p className="px-2.5 pt-1.5 pb-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-text-tertiary/60">
                          {cat.label}
                        </p>
                        {agentsInCat.map((agent) => {
                          const href = `/agents/${agent.route}`;
                          const isActive = pathname.startsWith(`/agents/${agent.route}`);
                          const IconComp = ICON_MAP[agent.icon] ?? FileText;
                          const unlocked = isPlanAtLeast(plan, agent.tier as PlanTier);
                          const comingSoon = agent.status === "coming_soon";
                          const locked = !unlocked || comingSoon;

                          if (locked) {
                            return (
                              <button
                                key={agent.id}
                                type="button"
                                onClick={() => setLockedPreview(agent)}
                                title={
                                  comingSoon
                                    ? `${agent.name} — coming soon`
                                    : `${agent.name} — upgrade to ${tierLabel(agent.tier as PlanTier)}`
                                }
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium text-text-tertiary/60 hover:bg-surface-2 hover:text-text-tertiary transition-colors text-left"
                              >
                                <IconComp className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate flex-1">{agent.shortName}</span>
                                <span className="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-accent">
                                  <Lock className="h-2.5 w-2.5" />
                                  {comingSoon ? "Soon" : tierLabel(agent.tier as PlanTier)}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <Link
                              key={agent.id}
                              href={href}
                              onClick={handleNavClick}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                                isActive
                                  ? "bg-surface-2 text-accent"
                                  : "text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
                              )}
                            >
                              <IconComp className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{agent.shortName}</span>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/agents/seo-audit"
              title="Agents"
              className={cn(
                "flex w-full items-center justify-center rounded-lg p-2.5 transition-colors",
                pathname.startsWith("/agents")
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              )}
            >
              <AgentsMenuIcon className="h-[18px] w-[18px]" />
            </Link>
          )}
          <SidebarLink
            href="/playground"
            icon={Play}
            label="Playground"
            active={pathname === "/playground"}
            showLabel={showLabel}
            onClick={handleNavClick}
          />

          {/* Settings with sub-items */}
          {showLabel ? (
            <div>
              <SidebarLink
                href="/settings"
                icon={Settings}
                label="Settings"
                active={pathname.startsWith("/settings")}
                showLabel={showLabel}
                onClick={handleNavClick}
              />
              {pathname.startsWith("/settings") && (
                <div className="ml-3 pl-3 border-l border-border-subtle mt-0.5 mb-1 space-y-0.5">
                  <ProjectSubLink href="/settings" icon={Settings} label="Profile" pathname={pathname} exact onClick={handleNavClick} />
                  <ProjectSubLink href="/settings/team" icon={Users} label="Team" pathname={pathname} onClick={handleNavClick} />
                  <ProjectSubLink href="/settings/billing" icon={CreditCard} label="Billing" pathname={pathname} onClick={handleNavClick} />
                  <ProjectSubLink href="/settings/integrations" icon={Link2} label="Integrations" pathname={pathname} exact onClick={handleNavClick} />
                  <ProjectSubLink href="/settings/integrations/webhooks" icon={Webhook} label="Webhooks" pathname={pathname} onClick={handleNavClick} />
                </div>
              )}
            </div>
          ) : (
            <SidebarLink
              href="/settings"
              icon={Settings}
              label="Settings"
              active={pathname.startsWith("/settings")}
              showLabel={showLabel}
              onClick={handleNavClick}
            />
          )}
        </nav>

        {/* Plan badge + sign out + collapse */}
        <div className="border-t border-border-subtle p-3 space-y-2 shrink-0">
          {/* Plan + usage */}
          {showLabel && profile && (
            <div className="rounded-lg border border-border-default bg-surface-1 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-caption font-medium text-text-secondary capitalize">
                  {plan} Plan
                </span>
                {!usageUnlimited && (
                  <span className="text-caption text-text-tertiary font-mono">
                    {usageCount}/{usageLimit}
                  </span>
                )}
              </div>
              {!usageUnlimited && (
                <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      usagePct >= 80 ? "bg-error" : usagePct >= 60 ? "bg-warning" : "bg-success"
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              )}
              {!usageUnlimited && usagePct >= 80 && (
                <p className="mt-2 text-[0.625rem] text-warning leading-tight">
                  {usagePct >= 100
                    ? "Out of generations this month."
                    : "You're running low on generations."}
                </p>
              )}
              {plan !== "agency" && (
                <Link
                  href="/settings/billing"
                  className="mt-2 block text-center text-caption text-accent hover:text-accent-hover transition-colors"
                  onClick={handleNavClick}
                >
                  Upgrade →
                </Link>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.875rem] font-medium text-text-secondary hover:bg-error/10 hover:text-error transition-colors",
              !showLabel && "justify-center"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {showLabel && <span>Sign out</span>}
          </button>

          {showLabel && (
            <div className="flex items-center justify-center gap-2 px-1 text-[0.6875rem] text-text-tertiary">
              <Link
                href="/privacy"
                onClick={handleNavClick}
                className="hover:text-text-secondary transition-colors"
              >
                Privacy
              </Link>
              <span aria-hidden className="text-text-tertiary/40">·</span>
              <Link
                href="/terms"
                onClick={handleNavClick}
                className="hover:text-text-secondary transition-colors"
              >
                Terms
              </Link>
              <span aria-hidden className="text-text-tertiary/40">·</span>
              <Link
                href="/data-deletion"
                onClick={handleNavClick}
                className="hover:text-text-secondary transition-colors"
              >
                Data
              </Link>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex w-full items-center justify-center rounded-lg p-2 text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      <LockedAgentModal
        agent={lockedPreview}
        onOpenChange={(open) => {
          if (!open) setLockedPreview(null);
        }}
      />
    </>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  showLabel,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  showLabel: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={!showLabel ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-all duration-150",
        !showLabel && "justify-center",
        active
          ? "border-l-2 border-accent bg-accent-muted text-accent"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {showLabel && <span>{label}</span>}
    </Link>
  );
}

function ProjectSubLink({
  href,
  icon: Icon,
  label,
  pathname,
  exact,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  pathname: string;
  exact?: boolean;
  onClick?: () => void;
}) {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
        isActive
          ? "bg-surface-2 text-accent"
          : "text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
