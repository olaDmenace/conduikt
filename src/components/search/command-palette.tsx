"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  FolderOpen,
  Sparkles,
  FileText,
  Settings,
  BarChart3,
  Globe,
  Target,
  Megaphone,
  Mail,
  Zap,
  Rocket,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useUIStore } from "@/src/stores/ui-store";

interface Project {
  id: string;
  name: string;
  website_url: string | null;
}

// Project-scoped destinations. `path` is appended to /projects/{id}/ and may
// include a query string (e.g. "content?skill=page-cro").
const AGENT_ITEMS = [
  { name: "SEO Audit", path: "audit", icon: AlertTriangle },
  { name: "Content Studio", path: "content", icon: Sparkles },
  { name: "Blog Writer", path: "blog", icon: Globe },
  { name: "Keywords", path: "keywords", icon: Search },
  { name: "Growth Playbook", path: "growth", icon: Rocket },
  { name: "CRO Agent", path: "content?skill=page-cro", icon: Target },
  { name: "Campaigns", path: "campaigns", icon: Megaphone },
  { name: "Calendar", path: "calendar", icon: Calendar },
  { name: "Emails", path: "emails", icon: Mail },
  { name: "Analytics", path: "analytics", icon: BarChart3 },
];

const PAGES = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Billing", href: "/settings/billing", icon: Zap },
  { name: "Integrations", href: "/settings/integrations", icon: Zap },
  { name: "Team", href: "/settings/team", icon: FolderOpen },
  { name: "New Project", href: "/projects/new", icon: FolderOpen },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggle = useUIStore((s) => s.toggleCommandPalette);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Array<{ id: string; title: string; project_id: string }>>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const fetchData = useCallback(async () => {
    if (!open) return;
    const [projRes, assetRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/projects?assets=recent"),
    ]);
    if (projRes.ok) {
      const data = await projRes.json();
      setProjects(Array.isArray(data) ? data : data.projects ?? []);
    }
    if (assetRes.ok) {
      const data = await assetRes.json();
      setAssets(Array.isArray(data) ? [] : data.recentAssets ?? []);
    }
  }, [open]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  if (!open) return null;

  const firstProject = projects[0];

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-surface-0/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <Command className="rounded-xl border border-border-default bg-surface-1 shadow-elevated overflow-hidden">
          <div className="flex items-center border-b border-border-subtle px-3">
            <Search className="h-4 w-4 text-text-tertiary shrink-0" />
            <Command.Input
              placeholder="Search projects, agents, pages..."
              className="flex-1 bg-transparent px-3 py-3 text-text-primary placeholder:text-text-tertiary text-[0.9375rem] outline-none"
            />
            <kbd className="shrink-0 rounded border border-border-default bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-mono text-text-tertiary">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-small text-text-tertiary">
              No results found.
            </Command.Empty>

            {projects.length > 0 && (
              <Command.Group
                heading={
                  <span className="text-caption text-text-tertiary font-medium px-2">
                    Projects
                  </span>
                }
              >
                {projects.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`project ${p.name} ${p.website_url ?? ""}`}
                    onSelect={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-small text-text-secondary cursor-pointer data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary"
                  >
                    <FolderOpen className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span className="truncate">{p.name}</span>
                    {p.website_url && (
                      <span className="ml-auto text-caption text-text-tertiary truncate max-w-32">
                        {p.website_url.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading={
                <span className="text-caption text-text-tertiary font-medium px-2">
                  Agents
                </span>
              }
            >
              {AGENT_ITEMS.map((agent) => (
                <Command.Item
                  key={agent.path}
                  value={`agent ${agent.name}`}
                  onSelect={() =>
                    navigate(
                      firstProject
                        ? `/projects/${firstProject.id}/${agent.path}`
                        : "/dashboard"
                    )
                  }
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-small text-text-secondary cursor-pointer data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary"
                >
                  <agent.icon className="h-4 w-4 text-text-tertiary shrink-0" />
                  <span>{agent.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading={
                <span className="text-caption text-text-tertiary font-medium px-2">
                  Pages
                </span>
              }
            >
              {PAGES.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`page ${page.name}`}
                  onSelect={() => navigate(page.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-small text-text-secondary cursor-pointer data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary"
                >
                  <page.icon className="h-4 w-4 text-text-tertiary shrink-0" />
                  <span>{page.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {assets.length > 0 && (
              <Command.Group
                heading={
                  <span className="text-caption text-text-tertiary font-medium px-2">
                    Recent Content
                  </span>
                }
              >
                {assets.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`content ${a.title}`}
                    onSelect={() =>
                      navigate(`/projects/${a.project_id}/library`)
                    }
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-small text-text-secondary cursor-pointer data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary"
                  >
                    <FileText className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span className="truncate">{a.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
