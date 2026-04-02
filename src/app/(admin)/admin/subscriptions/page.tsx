import { getSubscriptionStats, getAllUsers } from "@/src/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const [distribution, users] = await Promise.all([
    getSubscriptionStats(),
    getAllUsers(),
  ]);

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const plans = ["free", "pro", "growth", "agency"] as const;

  const planColors: Record<string, { bar: string; badge: string }> = {
    free: { bar: "bg-text-tertiary", badge: "bg-surface-2 text-text-secondary" },
    pro: { bar: "bg-accent", badge: "bg-accent-muted text-accent" },
    growth: { bar: "bg-success", badge: "bg-success/10 text-success" },
    agency: { bar: "bg-info", badge: "bg-info/10 text-info" },
  };

  // Paid users list
  const paidUsers = users.filter((u) => u.plan !== "free");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 text-text-primary">Subscriptions</h1>
        <p className="text-body text-text-secondary mt-1">
          Plan distribution and subscriber details
        </p>
      </div>

      {/* Plan distribution cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const count = distribution[plan] ?? 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          return (
            <div
              key={plan}
              className="rounded-xl border border-border-default bg-surface-1 p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium capitalize ${planColors[plan].badge}`}
                >
                  {plan}
                </span>
                <span className="text-caption text-text-tertiary">{pct}%</span>
              </div>
              <p className="text-[2rem] font-semibold text-text-primary font-mono leading-none mb-3">
                {count}
              </p>
              {/* Bar */}
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${planColors[plan].bar} transition-all duration-500`}
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual bar chart */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">Plan Distribution</h2>
        <div className="space-y-3">
          {plans.map((plan) => {
            const count = distribution[plan] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={plan} className="flex items-center gap-4">
                <span className="w-16 text-small text-text-secondary capitalize">
                  {plan}
                </span>
                <div className="flex-1 h-8 rounded-lg bg-surface-3 overflow-hidden">
                  <div
                    className={`h-full ${planColors[plan].bar} rounded-lg flex items-center px-3 transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  >
                    {pct > 10 && (
                      <span className="text-[0.75rem] font-medium text-surface-0">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-12 text-right text-data text-text-secondary">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paid subscribers table */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">
          Paid Subscribers ({paidUsers.length})
        </h2>
        {paidUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Name</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Plan</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Generations</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Projects</th>
                  <th className="text-caption text-text-tertiary pb-3">Since</th>
                </tr>
              </thead>
              <tbody>
                {paidUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border-subtle last:border-0"
                  >
                    <td className="py-3 pr-4 text-body text-text-primary">
                      {user.full_name ?? "Unnamed"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium capitalize ${planColors[user.plan]?.badge ?? planColors.free.badge}`}
                      >
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary">
                      {user.generation_count}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary">
                      {user.projectCount}
                    </td>
                    <td className="py-3 text-small text-text-secondary">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-tertiary">No paid subscribers yet</p>
        )}
      </div>
    </div>
  );
}
