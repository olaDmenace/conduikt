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
} from "@/src/components/ui/lucide-icons";

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
        <h1 className="text-display-s text-text">Finance</h1>
        <p className="mt-1 text-body text-text-2">
          Revenue, subscriptions, and payout ledger.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
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
          sub={`${usage.totalGenerations.toLocaleString()} pieces of content`}
        />
      </div>

      {/* MRR breakdown by plan */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Recurring revenue by plan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Plan</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Price</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Subscribers</th>
                <th className="text-label text-text-3 pb-3 text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.plan} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 text-body text-text capitalize">{row.plan}</td>
                  <td className="py-3 pr-4 text-right text-body-s font-mono text-text-2">
                    ${row.price}/mo
                  </td>
                  <td className="py-3 pr-4 text-right text-body-s font-mono text-text">
                    {row.count}
                  </td>
                  <td className="py-3 text-right font-mono text-body-s text-teal">
                    ${row.mrr.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-2">
                <td className="py-3 pr-4 text-body-s font-medium text-text">Total</td>
                <td className="py-3 pr-4"></td>
                <td className="py-3 pr-4 text-right text-body-s font-mono text-text">
                  {planRows.reduce((s, r) => s + r.count, 0)}
                </td>
                <td className="py-3 text-right font-mono text-body-s font-medium text-teal">
                  ${finance.mrr.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral revenue share summary */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Referral revenue share</h2>
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
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Recent payouts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Date</th>
                <th className="text-label text-text-3 pb-3 pr-4">Partner</th>
                <th className="text-label text-text-3 pb-3 pr-4">Method</th>
                <th className="text-label text-text-3 pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 text-body-s text-text-2">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-body-s text-text">{p.partner_name}</div>
                    <div className="text-caption text-text-3">{p.partner_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-body-s text-text-2 capitalize">
                    {p.method ?? "Not set"}
                  </td>
                  <td className="py-3 text-right text-body-s font-mono text-text">
                    ${Number(p.amount_usd).toFixed(2)}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-body text-text-3">
                    No payouts yet. Record one from the Referrals page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-caption text-text-3">
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
    <div className="bg-surface p-5">
      <div className="mb-2 flex items-center gap-2 text-text-3">
        {icon}
        <span className="text-label">{label}</span>
      </div>
      <p
        className={`text-numeric text-[1.75rem] ${
          accent ? "text-teal" : "text-text"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-caption text-text-3">{sub}</p>}
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
      <div className="mb-1 text-label text-text-3">{label}</div>
      <div
        className={`text-numeric text-[1.375rem] ${warn ? "text-accent" : "text-text"}`}
      >
        {value}
      </div>
    </div>
  );
}
