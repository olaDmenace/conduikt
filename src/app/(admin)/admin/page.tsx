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
        <h1 className="text-h1 text-text-primary">Platform Overview</h1>
        <p className="text-body text-text-secondary mt-1">
          Real-time metrics across the Conduikt platform
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} />
        <StatCard label="Generations (this month)" value={stats.generationsThisMonth} />
        <StatCard label="Total Projects" value={stats.totalProjects} />
      </div>

      {/* Daily generation chart */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">
          Daily Generations (last 30 days)
        </h2>
        <div className="flex items-end gap-[3px] h-40">
          {dailyGens.map((d) => {
            const height = maxGen > 0 ? (d.count / maxGen) * 100 : 0;
            return (
              <div
                key={d.date}
                className="group relative flex-1 flex flex-col items-center justify-end"
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-accent to-[#E0A76B] transition-all duration-200 hover:brightness-110 min-h-[2px]"
                  style={{ height: `${Math.max(height, 1.5)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-surface-3 px-2 py-1 text-[0.6875rem] text-text-primary whitespace-nowrap z-10 shadow-lg">
                  {d.date}: {d.count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-caption text-text-tertiary">
          <span>{dailyGens[0]?.date}</span>
          <span>{dailyGens[dailyGens.length - 1]?.date}</span>
        </div>
      </div>

      {/* Recent signups */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">Recent Signups</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Name</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Email</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Plan</th>
                <th className="text-caption text-text-tertiary pb-3">Signup Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="py-3 pr-4 text-body text-text-primary">
                    {user.full_name ?? "Unnamed"}
                  </td>
                  <td className="py-3 pr-4 text-small text-text-secondary">
                    {user.email}
                  </td>
                  <td className="py-3 pr-4">
                    <PlanBadge plan={user.plan} />
                  </td>
                  <td className="py-3 text-small text-text-secondary">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-tertiary text-body">
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
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <p className="text-caption text-text-tertiary mb-1">{label}</p>
      <p className="text-[2rem] font-semibold text-text-primary font-mono leading-none">
        {value.toLocaleString()}
      </p>
    </div>
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
