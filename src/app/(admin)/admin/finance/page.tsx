import {
  getFinanceStats,
  getReferralPayouts,
  getUsageData,
} from "@/src/lib/admin/queries";
import {
  Wallet,
  TrendingUp,
  Users,
  DollarSign,
  Receipt,
  PiggyBank,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const [finance, payouts, usage] = await Promise.all([
    getFinanceStats(),
    getReferralPayouts(),
    getUsageData(),
  ]);

  const grossProfit = finance.mrr - usage.totalCost / 30 * 30; // Simple estimation
  const netAfterCommissions = finance.mrr - finance.referral.unpaidCommissions;

  const planRows = Object.entries(finance.planCounts)
    .map(([plan, count]) => ({
      plan,
      count,
      price: finance.planPricing[plan] ?? 0,
      mrr: (finance.planPricing[plan] ?? 0) * count,
    }))
    .sort((a, b) => b.mrr - a.mrr);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 text-text-primary">Finance</h1>
        <p className="text-body text-text-secondary mt-1">
          Revenue, subscriptions, and payout ledger.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="MRR"
          value={`$${finance.mrr.toLocaleString()}`}
          sub={`$${finance.arr.toLocaleString()} ARR`}
          accent
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Net (after commissions)"
          value={`$${netAfterCommissions.toFixed(2)}`}
          sub={`−$${finance.referral.unpaidCommissions.toFixed(2)} owed`}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="New signups (MTD)"
          value={finance.newSignupsThisMonth.toLocaleString()}
          sub={`${finance.referral.referredUsers} via referral`}
        />
        <KpiCard
          icon={<Receipt className="h-4 w-4" />}
          label="AI cost run-rate"
          value={`$${usage.totalCost.toFixed(2)}`}
          sub={`${usage.totalGenerations.toLocaleString()} gens`}
        />
      </div>

      {/* MRR breakdown by plan */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Recurring Revenue by Plan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Plan</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Price</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Subscribers</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.plan} className="border-b border-border-subtle last:border-0">
                  <td className="py-3 pr-4 text-body text-text-primary capitalize">{row.plan}</td>
                  <td className="py-3 pr-4 text-right text-small font-mono text-text-secondary">
                    ${row.price}/mo
                  </td>
                  <td className="py-3 pr-4 text-right text-small font-mono text-text-primary">
                    {row.count}
                  </td>
                  <td className="py-3 text-right text-small font-mono text-accent">
                    ${row.mrr.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-2">
                <td className="py-3 pr-4 text-small font-medium text-text-primary">Total</td>
                <td className="py-3 pr-4"></td>
                <td className="py-3 pr-4 text-right text-small font-mono text-text-primary">
                  {planRows.reduce((s, r) => s + r.count, 0)}
                </td>
                <td className="py-3 text-right text-small font-mono text-accent font-semibold">
                  ${finance.mrr.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral revenue share summary */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Referral Revenue Share</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MiniStat
            label="Revenue tracked"
            value={`$${finance.referral.totalRevenue.toFixed(2)}`}
          />
          <MiniStat
            label="Commissions earned"
            value={`$${finance.referral.totalCommissions.toFixed(2)}`}
          />
          <MiniStat
            label="Unpaid to partners"
            value={`$${finance.referral.unpaidCommissions.toFixed(2)}`}
            warn={finance.referral.unpaidCommissions > 0}
          />
          <MiniStat
            label="Total paid out"
            value={`$${finance.referral.totalPayouts.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Recent payouts */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Recent Payouts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Date</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Partner</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Method</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="py-3 pr-4 text-small text-text-secondary">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-small text-text-primary">{p.partner_name}</div>
                    <div className="text-[0.75rem] text-text-tertiary">{p.partner_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-small text-text-secondary capitalize">
                    {p.method ?? "—"}
                  </td>
                  <td className="py-3 text-right text-small font-mono text-text-primary">
                    ${Number(p.amount_usd).toFixed(2)}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-tertiary text-body">
                    No payouts yet. Record one from the Referrals page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-caption text-text-tertiary">
        Hint: MRR is computed from current plan subscriptions in the profiles table.
        Stripe integration will replace this estimate with actual billed revenue once wired up.
        Gross margin proxy: MRR − AI run-rate = $
        {(grossProfit).toFixed(2)}/mo.
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <div className="flex items-center gap-2 text-text-tertiary mb-1">
        {icon}
        <span className="text-caption">{label}</span>
      </div>
      <p
        className={`text-[1.75rem] font-semibold font-mono leading-none ${
          accent ? "text-accent" : "text-text-primary"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-caption text-text-tertiary mt-1.5">{sub}</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="text-caption text-text-tertiary mb-1">{label}</div>
      <div
        className={`text-h3 font-mono ${warn ? "text-warning" : "text-text-primary"}`}
      >
        {value}
      </div>
    </div>
  );
}
