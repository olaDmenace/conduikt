import { Badge } from "@/src/components/ui/badge";
import {
  getAdminStats,
  getDailyGenerations,
  getRecentSignups,
} from "@/src/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, dailyGens, recentSignups] = await Promise.all([
    getAdminStats(),
    getDailyGenerations(),
    getRecentSignups(),
  ]);

  const maxGen = Math.max(...dailyGens.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display-s text-text">Platform overview</h1>
        <p className="mt-1 text-body text-text-2">
          Real-time metrics across the Conduikt platform
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} />
        <StatCard label="Active subscriptions" value={stats.activeSubscriptions} />
        <StatCard label="Pieces of content (this month)" value={stats.generationsThisMonth} />
        <StatCard label="Total projects" value={stats.totalProjects} />
      </div>

      {/* Daily generation chart */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">
          Pieces of content per day (last 30 days)
        </h2>
        <div className="flex h-40 gap-[3px]">
          {dailyGens.map((d) => {
            const height = maxGen > 0 ? (d.count / maxGen) * 100 : 0;
            return (
              <div
                key={d.date}
                className="group relative flex flex-1 flex-col items-center justify-end"
              >
                <div
                  className="min-h-[2px] w-full rounded-t-sm bg-teal transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] group-hover:bg-accent"
                  style={{ height: `${Math.max(height, 1.5)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 font-mono text-caption text-ink-text shadow-[var(--shadow-float)] group-hover:block">
                  {d.date}: {d.count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-caption text-text-3">
          <span>{dailyGens[0]?.date}</span>
          <span>{dailyGens[dailyGens.length - 1]?.date}</span>
        </div>
      </div>

      {/* Recent signups */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">Recent signups</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-3 pr-4 text-label text-text-3">Name</th>
                <th className="pb-3 pr-4 text-label text-text-3">Email</th>
                <th className="pb-3 pr-4 text-label text-text-3">Plan</th>
                <th className="pb-3 text-label text-text-3">Signup date</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="py-3 pr-4 text-body text-text">
                    {user.full_name ?? "Unnamed"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                    {user.email}
                  </td>
                  <td className="py-3 pr-4">
                    <PlanBadge plan={user.plan} />
                  </td>
                  <td className="py-3 text-body-s text-text-2">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-body text-text-3">
                    No signups yet
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface p-5">
      <p className="mb-2 text-label text-text-3">{label}</p>
      <p className="text-numeric text-[2rem] text-text">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const tier = (["free", "pro", "growth", "agency"] as const).find((t) => t === plan) ?? "free";
  return <Badge variant={tier}>{plan ?? "free"}</Badge>;
}
