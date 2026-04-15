import { getReferralStats, getReferralPayouts } from "@/src/lib/admin/queries";
import { ReferralsClient } from "./referrals-client";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const [stats, payouts] = await Promise.all([
    getReferralStats(),
    getReferralPayouts(),
  ]);

  return <ReferralsClient stats={stats} payouts={payouts} />;
}
