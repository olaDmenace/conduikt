"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";

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
    let result = projects.filter(
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text-primary">Projects</h1>
          <p className="text-body text-text-secondary mt-1">
            {projects.length} total projects
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-2 pl-9 pr-4 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 w-72"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-0/50">
                <SortHeader label="Name" sortKey="name" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Owner" sortKey="ownerName" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="text-caption text-text-tertiary px-4 py-3">Website</th>
                <SortHeader label="Generations" sortKey="generationCount" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Created" sortKey="created_at" current={sortKey} asc={sortAsc} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="px-4 py-3 text-body text-text-primary">
                    {project.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-small text-text-secondary">{project.ownerName}</div>
                    <div className="text-[0.75rem] text-text-tertiary">{project.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary font-mono max-w-[200px] truncate">
                    {project.website_url ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-data text-text-secondary">
                    {project.generationCount}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-tertiary text-body">
                    No projects found
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
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-caption text-text-tertiary hover:text-text-primary transition-colors"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${current === sortKey ? "text-accent" : ""}`} />
      </button>
    </th>
  );
}
