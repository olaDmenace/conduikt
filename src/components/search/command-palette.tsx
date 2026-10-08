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
  Zap,
} from "@/src/components/ui/lucide-icons";
import { useUIStore } from "@/src/stores/ui-store";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";
import { agentDisplay } from "@/src/lib/ai/agents/display";

interface Project {
  id: string;
  name: string;
  website_url: string | null;
}

const PAGES = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Billing", href: "/settings/billing", icon: Zap },
  { name: "Integrations", href: "/settings/integrations", icon: Zap },
  { name: "Team", href: "/settings/team", icon: FolderOpen },
  { name: "New project", href: "/projects/new", icon: FolderOpen },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggle = useUIStore((s) => s.toggleCommandPalette);
  const currentProjectId = useUIStore((s) => s.currentProjectId);
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

  // Agents run against the project the rail is scoped to.
  const agentProjectId = currentProjectId ?? projects[0]?.id ?? null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-overlay/60"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <Command label="Search Conduikt" className="overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-float)]">
          <div className="flex items-center border-b border-line px-3">
            <Search className="h-4 w-4 shrink-0 text-text-3" />
            <Command.Input
              placeholder="Search projects, agents, pages…"
              className="flex-1 bg-transparent px-3 py-3 text-[15px] text-text outline-none placeholder:text-text-3"
            />
            <kbd className="shrink-0 rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-text-3">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-body-s text-text-3">
              Nothing matches that. Try a project, agent or page name.
            </Command.Empty>

            {projects.length > 0 && (
              <Command.Group
                heading={
                  <span className="block px-2 pb-1 pt-2 text-label text-text-3">
                    Projects
                  </span>
                }
              >
                {projects.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`project ${p.name} ${p.website_url ?? ""}`}
                    onSelect={() => navigate(`/projects/${p.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-text"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-text-3" />
                    <span className="truncate">{p.name}</span>
                    {p.website_url && (
                      <span className="ml-auto max-w-32 truncate font-mono text-caption text-text-3">
                        {p.website_url.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading={
                <span className="block px-2 pb-1 pt-2 text-label text-text-3">
                  Ask an agent to
                </span>
              }
            >
              {AGENT_REGISTRY.map((agent) => {
                const d = agentDisplay(agent);
                return (
                  <Command.Item
                    key={agent.id}
                    value={`agent ${d.name} ${d.job} ${agent.shortName}`}
                    onSelect={() =>
                      navigate(
                        agentProjectId
                          ? `/projects/${agentProjectId}/${agent.projectPath ?? agent.route}`
                          : "/projects/new"
                      )
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-text"
                  >
                    <Sparkles className="h-4 w-4 text-text-3 shrink-0" aria-hidden />
                    <span className="truncate">{d.name}</span>
                    <span className="ml-auto truncate text-caption text-text-3">{d.job}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group
              heading={
                <span className="block px-2 pb-1 pt-2 text-label text-text-3">
                  Pages
                </span>
              }
            >
              {PAGES.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`page ${page.name}`}
                  onSelect={() => navigate(page.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-text"
                >
                  <page.icon className="h-4 w-4 shrink-0 text-text-3" />
                  <span>{page.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {assets.length > 0 && (
              <Command.Group
                heading={
                  <span className="block px-2 pb-1 pt-2 text-label text-text-3">
                    Recent content
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
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-text"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-text-3" />
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
