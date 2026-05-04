"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, Download } from "lucide-react";

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
    let result = users.filter(
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text-primary">Users</h1>
          <p className="text-body text-text-secondary mt-1">
            {users.length} registered users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/users/export"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-small font-medium text-text-primary hover:border-accent hover:bg-accent-muted transition-colors"
            title="Download all users as CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-border-default bg-surface-2 pl-9 pr-4 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 w-72"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-0/50">
                <SortHeader label="Name" sortKey="full_name" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Email" sortKey="email" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Plan" sortKey="plan" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Generations" sortKey="generation_count" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Projects" sortKey="projectCount" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="text-caption text-text-tertiary px-4 py-3">Role</th>
                <SortHeader label="Signup" sortKey="created_at" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Last Sign In" sortKey="lastSignIn" current={sortKey} asc={sortAsc} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-body text-text-primary hover:text-accent transition-colors"
                    >
                      {user.full_name ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={user.plan} />
                  </td>
                  <td className="px-4 py-3 text-data text-text-secondary">
                    {user.generation_count}
                  </td>
                  <td className="px-4 py-3 text-data text-text-secondary">
                    {user.projectCount}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <span className="inline-block rounded-full bg-warning/10 text-warning px-2.5 py-0.5 text-[0.75rem] font-medium">
                        admin
                      </span>
                    ) : (
                      <span className="text-small text-text-tertiary">user</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary whitespace-nowrap">
                    {user.lastSignIn
                      ? new Date(user.lastSignIn).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-text-tertiary text-body">
                    No users found
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

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "bg-surface-2 text-text-secondary",
    pro: "bg-accent-muted text-accent",
    growth: "bg-success/10 text-success",
    agency: "bg-info/10 text-info",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium capitalize ${colors[plan] ?? colors.free}`}
    >
      {plan ?? "free"}
    </span>
  );
}
