"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "@/src/components/ui/lucide-icons";

const PAGE_SIZE = 50;

type Generation = {
  id: string;
  agent_used: string;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string;
  duration_ms: number | null;
  created_at: string;
  project_id: string;
  projectName: string;
};

export function AdminGenerationsClient({
  generations,
}: {
  generations: Generation[];
}) {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [page, setPage] = useState(1);

  // Unique agents and projects for filter dropdowns
  const agents = useMemo(
    () => [...new Set(generations.map((g) => g.agent_used))].sort(),
    [generations]
  );
  const projects = useMemo(
    () =>
      [...new Map(generations.map((g) => [g.project_id, g.projectName])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [generations]
  );

  const filtered = useMemo(() => {
    return generations.filter((g) => {
      if (agentFilter && g.agent_used !== agentFilter) return false;
      if (projectFilter && g.project_id !== projectFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          g.agent_used.toLowerCase().includes(q) ||
          g.projectName.toLowerCase().includes(q) ||
          g.model.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [generations, search, agentFilter, projectFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  useEffect(() => {
    setPage(1);
  }, [search, agentFilter, projectFilter]);

  // Aggregated stats
  const totalTokens = filtered.reduce(
    (sum, g) => sum + (g.input_tokens ?? 0) + (g.output_tokens ?? 0),
    0
  );
  const avgDuration =
    filtered.length > 0
      ? filtered.reduce((sum, g) => sum + (g.duration_ms ?? 0), 0) / filtered.length
      : 0;

  // Most-used agent
  const agentCounts: Record<string, number> = {};
  filtered.forEach((g) => {
    agentCounts[g.agent_used] = (agentCounts[g.agent_used] ?? 0) + 1;
  });
  const mostUsedAgent =
    Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-s text-text">Pieces of content</h1>
        <p className="mt-1 text-body text-text-2">
          {generations.length} pieces of content in total
        </p>
      </div>

      {/* Aggregated stats */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        <div className="bg-surface p-5">
          <p className="mb-2 text-label text-text-3">Total tokens</p>
          <p className="text-numeric text-[1.5rem] text-text">
            {totalTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface p-5">
          <p className="mb-2 text-label text-text-3">Avg duration</p>
          <p className="text-numeric text-[1.5rem] text-text">
            {(avgDuration / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="bg-surface p-5">
          <p className="mb-2 text-label text-text-3">Most-used agent</p>
          <p className="text-heading capitalize text-text">
            {mostUsedAgent.replace(/-/g, " ")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-line-strong bg-surface pl-9 pr-4 py-2 text-body text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-56"
          />
        </div>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-3 py-2 text-body text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a.replace(/-/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-3 py-2 text-body text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-ground">
                <th className="text-label text-text-3 px-4 py-3">Agent</th>
                <th className="text-label text-text-3 px-4 py-3">Project</th>
                <th className="text-label text-text-3 px-4 py-3">Tokens (in+out)</th>
                <th className="text-label text-text-3 px-4 py-3">Duration</th>
                <th className="text-label text-text-3 px-4 py-3">Model</th>
                <th className="text-label text-text-3 px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-line transition-colors duration-[var(--duration-fast)] last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3 text-body text-text capitalize">
                    {g.agent_used.replace(/-/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-body-s text-text-2">
                    {g.projectName}
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {((g.input_tokens ?? 0) + (g.output_tokens ?? 0)).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : "Not recorded"}
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {g.model}
                  </td>
                  <td className="px-4 py-3 text-body-s text-text-2">
                    {new Date(g.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-body text-text-3">
                    Nothing matches these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <p className="text-body-s text-text-3">
              Showing {pageStart + 1}–{pageEnd} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-body-s text-text hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="font-mono text-body-s text-text-3">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-body-s text-text hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
