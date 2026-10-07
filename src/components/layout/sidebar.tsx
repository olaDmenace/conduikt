"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Attention,
  Calendar,
  ChartLine,
  Refresh,
  Search,
  Plan,
  Edit,
  SendOne,
  Mail,
  Peoples,
  SendEmail,
  FolderOpen,
  Voice,
  Link as LinkIcon,
  SettingTwo,
  Logout,
  Down,
  Plus,
  Close,
  MenuFoldOne,
  MenuUnfoldOne,
} from "@icon-park/react";
import { cn } from "@/src/lib/utils/cn";
import { useUIStore } from "@/src/stores/ui-store";
import { createClient } from "@/src/lib/supabase/client";
import { signOutAction } from "@/src/app/(auth)/logout/action";
import { markSigningOut } from "@/src/lib/auth/signing-out";
import { AGENT_GROUPS, agentsInGroup } from "@/src/lib/ai/agents/display";
import { getGenerationLimit, isUnlimited, normalizePlan, tierLabel, type PlanTier } from "@/src/lib/plans";
import { SidebarItem, SidebarSection, RailTooltip } from "@/src/components/ui/sidebar-item";
import { IconButton } from "@/src/components/ui/button";

// docs/DESIGN.md §App architecture · Navigation model.
//
//   Project switcher
//   Primary: Home · Drafts waiting for your OK · Calendar · Analytics · What we learned
//   Ask an agent to: Check my site · Plan what to say · Write something · Post and schedule
//   Your email list: Email series · Subscribers & sign-up forms · One-off emails
//   Settings: Everything we made · How you sound · Connected accounts
//   Footer: plan tile (ink), sign out, legal
//
// Rail: drawer under 768px, 64px icon rail 768–999px, 240px at ≥1000px
// (or 64px when the user collapses it). The nested per-project tree, the
// global Agents menu and Playground are gone — agents open in AgentPicker.

interface Project {
  id: string;
  name: string;
  website_url: string | null;
}

interface Profile {
  plan: string;
  generation_count: number;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  analysis: <Search size={20} fill="currentColor" />,
  strategy: <Plan size={20} fill="currentColor" />,
  creation: <Edit size={20} fill="currentColor" />,
  distribution: <SendOne size={20} fill="currentColor" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const currentProjectId = useUIStore((s) => s.currentProjectId);
  const setCurrentProjectId = useUIStore((s) => s.setCurrentProjectId);
  const openAgentPicker = useUIStore((s) => s.openAgentPicker);

  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Keep the rail scoped to the project in the URL.
  const urlProjectId = pathname.match(/^\/projects\/([0-9a-f-]{8,})/i)?.[1] ?? null;
  useEffect(() => {
    if (urlProjectId && urlProjectId !== currentProjectId) setCurrentProjectId(urlProjectId);
  }, [urlProjectId, currentProjectId, setCurrentProjectId]);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [projectsRes, profileRes] = await Promise.all([
        supabase.from("projects").select("id, name, website_url").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("profiles").select("plan, generation_count").eq("id", user.id).single(),
      ]);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      fetch("/api/automation/queue", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setDraftCount(Array.isArray(d?.items) ? d.items.length : Array.isArray(d) ? d.length : 0))
        .catch(() => {});
    }
    load();
    const onGeneration = () => load();
    window.addEventListener("conduikt:generation", onGeneration);
    return () => window.removeEventListener("conduikt:generation", onGeneration);
  }, []);

  // Fall back to the first project when nothing is selected yet.
  useEffect(() => {
    if (!currentProjectId && projects.length > 0) setCurrentProjectId(projects[0].id);
    if (currentProjectId && projects.length > 0 && !projects.some((p) => p.id === currentProjectId)) {
      setCurrentProjectId(projects[0].id);
    }
  }, [projects, currentProjectId, setCurrentProjectId]);

  useEffect(() => {
    if (!switcherOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!switcherRef.current?.contains(e.target as Node)) setSwitcherOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSwitcherOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [switcherOpen]);

  async function handleLogout() {
    markSigningOut();
    setMobileMenuOpen(false);
    try {
      await signOutAction();
    } catch {
      // Middleware bounces to /login if the session survived.
    }
    window.location.assign("/login");
  }

  const close = () => setMobileMenuOpen(false);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;
  const base = project ? `/projects/${project.id}` : null;
  const at = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const plan: PlanTier = normalizePlan(profile?.plan);
  const used = profile?.generation_count ?? 0;
  const limit = getGenerationLimit(plan);
  const unlimited = isUnlimited(limit);
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);

  // Label visibility: hidden in the 64px rail (768–999px always, ≥1000px
  // when the user collapsed it). The mobile drawer always shows labels.
  const compactLabel = cn("md:max-[999px]:sr-only", collapsed && "min-[1000px]:sr-only");
  const projectHref = (suffix: string) => (base ? `${base}${suffix}` : "/projects/new");

  return (
    <>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={close} aria-hidden />
      )}

      <aside
        aria-label="Main"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-line bg-ground transition-[transform,width] duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:w-16 md:translate-x-0",
          collapsed ? "min-[1000px]:w-16" : "min-[1000px]:w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-3">
          <Link href="/dashboard" onClick={close} className="flex items-center" aria-label="Conduikt home">
            <Image src="/conduikt-icon.png" alt="" width={32} height={32} className="h-8 w-8" priority />
            <span className={cn("ml-2 font-display text-lg font-medium tracking-tight text-text", compactLabel)}>
              Conduikt
            </span>
          </Link>
          <IconButton label="Close menu" onClick={close} className="md:hidden">
            <Close size={20} fill="currentColor" />
          </IconButton>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Sections">
          {/* Project switcher */}
          <div ref={switcherRef} className="relative mb-1">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={switcherOpen}
              aria-label={project ? `Project: ${project.name}. Switch project` : "Choose a project"}
              className="flex h-10 w-full items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 text-left text-sm text-text hover:bg-surface-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-ink font-mono text-[11px] text-ink-text">
                {(project?.name ?? "+").charAt(0).toUpperCase()}
              </span>
              <span className={cn("flex-1 truncate", compactLabel)}>
                {project?.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || project?.name || "Add your website"}
              </span>
              <Down size={16} fill="currentColor" className={cn("shrink-0 text-text-3", compactLabel)} />
            </button>
            {switcherOpen && (
              <div
                role="menu"
                className="absolute left-0 top-11 z-10 w-56 rounded-md border border-line bg-surface p-1 shadow-[var(--shadow-float)]"
              >
                {projects.map((p) => (
                  <button
                    key={p.id}
                    role="menuitemradio"
                    aria-checked={p.id === currentProjectId}
                    onClick={() => {
                      setCurrentProjectId(p.id);
                      setSwitcherOpen(false);
                      close();
                      router.push(`/projects/${p.id}`);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm hover:bg-surface-2",
                      p.id === currentProjectId ? "text-text" : "text-text-2"
                    )}
                  >
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
                <Link
                  href="/projects/new"
                  role="menuitem"
                  onClick={() => { setSwitcherOpen(false); close(); }}
                  className="mt-1 flex h-9 items-center gap-2 rounded-sm border-t border-line px-2.5 text-sm text-accent-hover hover:bg-surface-2"
                >
                  <Plus size={16} fill="currentColor" /> Add a website
                </Link>
              </div>
            )}
          </div>

          {/* Primary */}
          <div className="space-y-0.5 pt-2">
            <SidebarItem
              href={base ?? "/dashboard"}
              icon={<Home size={20} fill="currentColor" />}
              label="Home"
              current={base ? at(base, true) : at("/dashboard", true)}
              onClick={close}
              labelClassName={compactLabel}
            />
            <SidebarItem
              href="/automation/queue"
              icon={<Attention size={20} fill="currentColor" />}
              label="Drafts waiting for your OK"
              count={draftCount}
              current={at("/automation/queue")}
              onClick={close}
              labelClassName={compactLabel}
            />
            <SidebarItem
              href={projectHref("/calendar")}
              icon={<Calendar size={20} fill="currentColor" />}
              label="Calendar"
              current={!!base && at(`${base}/calendar`)}
              onClick={close}
              labelClassName={compactLabel}
            />
            <SidebarItem
              href={projectHref("/analytics")}
              icon={<ChartLine size={20} fill="currentColor" />}
              label="Analytics"
              current={!!base && at(`${base}/analytics`)}
              onClick={close}
              labelClassName={compactLabel}
            />
            <SidebarItem
              href={projectHref("/learnings")}
              icon={<Refresh size={20} fill="currentColor" />}
              label="What we learned"
              current={!!base && at(`${base}/learnings`)}
              onClick={close}
              labelClassName={compactLabel}
            />
          </div>

          {/* Ask an agent to — the only place agents appear in the rail */}
          <SidebarSection label="Ask an agent to" labelClassName={compactLabel}>
            {AGENT_GROUPS.map((g) => (
              <button
                key={g.category}
                type="button"
                onClick={() => { close(); openAgentPicker(g.category); }}
                className="group relative flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-text-2 transition-colors duration-[var(--duration-fast)] hover:bg-surface-2 hover:text-text"
              >
                <span className="shrink-0" aria-hidden>{GROUP_ICONS[g.category]}</span>
                <span className={cn("flex-1 truncate", compactLabel)}>{g.label}</span>
                <span className={cn("font-mono text-xs text-text-3", compactLabel)}>
                  {agentsInGroup(g.category).length}
                </span>
                <RailTooltip label={g.label} />
              </button>
            ))}
          </SidebarSection>

          {/* Your email list */}
          <SidebarSection label="Your email list" labelClassName={compactLabel}>
            <SidebarItem href={projectHref("/emails")} icon={<Mail size={20} fill="currentColor" />} label="Email series" current={!!base && at(`${base}/emails`)} onClick={close} labelClassName={compactLabel} />
            <SidebarItem href={projectHref("/audiences")} icon={<Peoples size={20} fill="currentColor" />} label="Subscribers & sign-up forms" current={!!base && (at(`${base}/audiences`) || at(`${base}/forms`))} onClick={close} labelClassName={compactLabel} />
            <SidebarItem href={projectHref("/broadcasts")} icon={<SendEmail size={20} fill="currentColor" />} label="One-off emails" current={!!base && at(`${base}/broadcasts`)} onClick={close} labelClassName={compactLabel} />
          </SidebarSection>

          {/* Settings */}
          <SidebarSection label="Settings" labelClassName={compactLabel}>
            <SidebarItem href={projectHref("/library")} icon={<FolderOpen size={20} fill="currentColor" />} label="Everything we made" current={!!base && at(`${base}/library`)} onClick={close} labelClassName={compactLabel} />
            <SidebarItem href="/settings/brand" icon={<Voice size={20} fill="currentColor" />} label="How you sound" current={at("/settings/brand")} onClick={close} labelClassName={compactLabel} />
            <SidebarItem href="/settings/integrations" icon={<LinkIcon size={20} fill="currentColor" />} label="Connected accounts" current={at("/settings/integrations")} onClick={close} labelClassName={compactLabel} />
            <SidebarItem href="/settings" icon={<SettingTwo size={20} fill="currentColor" />} label="Account" current={pathname === "/settings" || at("/settings/billing") || at("/settings/team")} onClick={close} labelClassName={compactLabel} />
          </SidebarSection>
        </nav>

        {/* Footer: plan tile, sign out, legal */}
        <div className="shrink-0 space-y-2 border-t border-line p-2">
          {profile && (
            <div className={cn("band-ink rounded-lg border border-ink-line p-3", compactLabel)}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-label text-ink-text-3">{tierLabel(plan)} plan</span>
                {!unlimited && (
                  <span className="font-mono text-xs text-ink-text-2">{used} of {limit}</span>
                )}
              </div>
              {!unlimited && (
                <>
                  <div
                    className="h-1 overflow-hidden rounded-sm bg-ink-line"
                    role="progressbar"
                    aria-valuenow={used}
                    aria-valuemin={0}
                    aria-valuemax={limit}
                    aria-label="Pieces of content used this month"
                  >
                    <div
                      className={cn("h-full", pct >= 80 ? "bg-ink-accent" : "bg-ink-teal")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-caption text-ink-text-2">Pieces of content this month</p>
                </>
              )}
              {plan !== "agency" && (
                <Link href="/settings/billing" onClick={close} className="mt-2 inline-block text-caption font-medium text-ink-accent hover:underline">
                  Upgrade
                </Link>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-text-2 hover:bg-surface-2 hover:text-danger"
          >
            <Logout size={20} fill="currentColor" aria-hidden />
            <span className={compactLabel}>Sign out</span>
          </button>

          <div className={cn("flex items-center justify-center gap-2 text-caption text-text-3", compactLabel)}>
            <Link href="/privacy" onClick={close} className="hover:text-text">Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" onClick={close} className="hover:text-text">Terms</Link>
            <span aria-hidden>·</span>
            <Link href="/data-deletion" onClick={close} className="hover:text-text">Delete my data</Link>
          </div>

          <IconButton
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleSidebar}
            className="hidden w-full min-[1000px]:inline-flex"
          >
            {collapsed ? <MenuUnfoldOne size={20} fill="currentColor" /> : <MenuFoldOne size={20} fill="currentColor" />}
          </IconButton>
        </div>
      </aside>
    </>
  );
}
