import { Badge } from "@/src/components/ui/badge";
import { getSubscriptionStats, getAllUsers } from "@/src/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const [distribution, users] = await Promise.all([
    getSubscriptionStats(),
    getAllUsers(),
  ]);

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const plans = ["free", "pro", "growth", "agency"] as const;

  // Teal is the data colour; the paid tiers step from light to deep.
  const planBars: Record<string, string> = {
    free: "bg-line-strong",
    pro: "bg-teal",
    growth: "bg-ink-teal",
    agency: "bg-ink",
  };
  const tierVariant = (plan: string) =>
    (["free", "pro", "growth", "agency"] as const).find((t) => t === plan) ?? "free";

  // Paid users list
  const paidUsers = users.filter((u) => u.plan !== "free");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-s text-text">Subscriptions</h1>
        <p className="mt-1 text-body text-text-2">
          Plan distribution and subscriber details
        </p>
      </div>

      {/* Plan distribution cards */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const count = distribution[plan] ?? 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          return (
            <div key={plan} className="bg-surface p-5">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant={plan}>{plan}</Badge>
                <span className="font-mono text-caption text-text-3">{pct}%</span>
              </div>
              <p className="mb-3 text-numeric text-[2rem] text-text">
                {count}
              </p>
              {/* Bar */}
              <div className="h-1.5 overflow-hidden rounded-sm bg-surface-2">
                <div
                  className={`h-full ${planBars[plan]}`}
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual bar chart */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">Plan distribution</h2>
        <div className="space-y-3">
          {plans.map((plan) => {
            const count = distribution[plan] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={plan} className="flex items-center gap-4">
                <span className="w-16 text-body-s capitalize text-text-2">
                  {plan}
                </span>
                <div className="h-8 flex-1 overflow-hidden rounded-sm bg-surface-2">
                  <div
                    className={`flex h-full items-center px-3 ${planBars[plan]}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  >
                    {pct > 10 && (
                      <span className={`font-mono text-caption font-medium ${plan === "free" ? "text-text" : "text-white"}`}>
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-12 text-right font-mono text-body-s text-text-2">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paid subscribers table */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">
          Paid subscribers ({paidUsers.length})
        </h2>
        {paidUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-label text-text-3 pb-3 pr-4">Name</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Plan</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Pieces of content</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Projects</th>
                  <th className="text-label text-text-3 pb-3">Since</th>
                </tr>
              </thead>
              <tbody>
                {paidUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="py-3 pr-4 text-body text-text">
                      {user.full_name ?? "Unnamed"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={tierVariant(user.plan)}>{user.plan}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                      {user.generation_count}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                      {user.projectCount}
                    </td>
                    <td className="py-3 text-body-s text-text-2">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-3">No paid subscribers yet.</p>
        )}
      </div>
    </div>
  );
}
