import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin/auth";
import { createServiceClient } from "@/src/lib/supabase/service";

// POST — record a manual payout.
// If referral_link_id is supplied, settles all unpaid earnings for that link
// up to the payout amount and marks them paid.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    partner_name,
    partner_email,
    amount_usd,
    method,
    reference,
    notes,
    referral_link_id,
  } = body ?? {};

  if (!partner_name || !partner_email || amount_usd === undefined) {
    return NextResponse.json(
      { error: "partner_name, partner_email, and amount_usd are required" },
      { status: 400 }
    );
  }

  const svc = createServiceClient();

  const { data: payout, error } = await svc
    .from("referral_payouts")
    .insert({
      partner_name,
      partner_email,
      amount_usd: Number(amount_usd),
      method: method ?? null,
      reference: reference ?? null,
      notes: notes ?? null,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Settle unpaid earnings FIFO for the link, up to the payout amount
  if (referral_link_id && payout) {
    const { data: unpaid } = await svc
      .from("referral_earnings")
      .select("id, commission_usd")
      .eq("referral_link_id", referral_link_id)
      .eq("paid_out", false)
      .order("created_at", { ascending: true });

    let remaining = Number(amount_usd);
    const idsToSettle: string[] = [];
    for (const row of unpaid ?? []) {
      const c = Number(row.commission_usd ?? 0);
      if (c <= remaining + 0.001) {
        idsToSettle.push(row.id);
        remaining -= c;
        if (remaining <= 0.001) break;
      }
    }

    if (idsToSettle.length > 0) {
      await svc
        .from("referral_earnings")
        .update({ paid_out: true, payout_id: payout.id })
        .in("id", idsToSettle);
    }
  }

  return NextResponse.json(payout);
}
