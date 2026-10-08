"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, Download } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

type User = {
  id: string;
  full_name: string | null;
  email: string;
  plan: string;
  generation_count: number;
  role: string;
  created_at: string;
  lastSignIn: string | null;
  projectCount: number;
};

type SortKey = "full_name" | "email" | "plan" | "generation_count" | "projectCount" | "created_at" | "lastSignIn";

export function AdminUsersClient({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "full_name") {
        cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
      } else if (sortKey === "email") {
        cmp = a.email.localeCompare(b.email);
      } else if (sortKey === "plan") {
        cmp = a.plan.localeCompare(b.plan);
      } else if (sortKey === "generation_count") {
        cmp = a.generation_count - b.generation_count;
      } else if (sortKey === "projectCount") {
        cmp = a.projectCount - b.projectCount;
      } else if (sortKey === "lastSignIn") {
        cmp = new Date(a.lastSignIn ?? 0).getTime() - new Date(b.lastSignIn ?? 0).getTime();
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [users, search, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-s text-text">Users</h1>
          <p className="mt-1 text-body text-text-2">
            {users.length} registered users
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
          <a
            href="/api/admin/users/export"
            download
            title="Download all users as CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          </Button>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-line-strong bg-surface pl-9 pr-4 py-2 text-body text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full sm:w-72"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-ground">
                <SortHeader label="Name" sortKey="full_name" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Email" sortKey="email" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Plan" sortKey="plan" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Pieces of content" sortKey="generation_count" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Projects" sortKey="projectCount" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="text-label text-text-3 px-4 py-3">Role</th>
                <SortHeader label="Signup" sortKey="created_at" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Last sign in" sortKey="lastSignIn" current={sortKey} asc={sortAsc} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-line transition-colors duration-[var(--duration-fast)] last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="hover-link text-body text-text hover:text-accent-hover"
                    >
                      {user.full_name ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={user.plan} />
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {user.generation_count}
                  </td>
                  <td className="px-4 py-3 font-mono text-body-s text-text-2">
                    {user.projectCount}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <Badge variant="count">admin</Badge>
                    ) : (
                      <span className="text-body-s text-text-3">user</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-s text-text-2 whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-body-s text-text-2 whitespace-nowrap">
                    {user.lastSignIn
                      ? new Date(user.lastSignIn).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-body text-text-3">
                    No users match this search.
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

function PlanBadge({ plan }: { plan: string }) {
  const tier = (["free", "pro", "growth", "agency"] as const).find((t) => t === plan) ?? "free";
  return <Badge variant={tier}>{plan ?? "free"}</Badge>;
}
