"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "@/src/components/ui/lucide-icons";

type Project = {
  id: string;
  name: string;
  website_url: string | null;
  user_id: string;
  created_at: string;
  ownerName: string;
  ownerEmail: string;
  generationCount: number;
};

type SortKey = "name" | "ownerName" | "generationCount" | "created_at";

export function AdminProjectsClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.ownerEmail.toLowerCase().includes(q)
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "ownerName") cmp = a.ownerName.localeCompare(b.ownerName);
      else if (sortKey === "generationCount") cmp = a.generationCount - b.generationCount;
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [projects, search, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-s text-text">Projects</h1>
          <p className="mt-1 text-body text-text-2">
            {projects.length} total projects
          </p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <input
            type="text"
            placeholder="Search by name or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-line-strong bg-surface pl-9 pr-4 py-2 text-body text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full sm:w-72"
          />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-ground">
                <SortHeader label="Name" sortKey="name" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Owner" sortKey="ownerName" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="text-label text-text-3 px-4 py-3">Website</th>
                <SortHeader label="Pieces of content" sortKey="generationCount" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Created" sortKey="created_at" current={sortKey} asc={sortAsc} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-line transition-colors duration-[var(--duration-fast)] last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3 text-body text-text">
                    {project.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-body-s text-text-2">{project.ownerName}</div>
                    <div className="text-caption text-text-3">{project.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-body-s text-text-2 font-mono max-w-[200px] truncate">
                    {project.website_url ?? "Not set"}
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {project.generationCount}
                  </td>
                  <td className="px-4 py-3 text-body-s text-text-2">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-body text-text-3">
                    No projects match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="hover-link flex items-center gap-1 text-label text-text-3 hover:text-text"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${current === sortKey ? "text-accent" : ""}`} />
      </button>
    </th>
  );
}
