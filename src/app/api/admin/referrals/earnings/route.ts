import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin/auth";
import { createServiceClient } from "@/src/lib/supabase/service";

// POST — credit a manual earning to a referral link
// Use case: admin records an external Stripe/Paystack payment for a referred
// customer and wants to credit the partner's commission.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    referral_link_id,
    payment_amount_usd,
    payment_reference,
    commission_usd: overrideCommission,
    user_id,
  } = body ?? {};

  if (!referral_link_id || payment_amount_usd === undefined) {
    return NextResponse.json(
      { error: "referral_link_id and payment_amount_usd are required" },
      { status: 400 }
    );
  }

  const svc = createServiceClient();

  const { data: link, error: linkErr } = await svc
    .from("referral_links")
    .select("id, commission_type, commission_rate, flat_amount_usd")
    .eq("id", referral_link_id)
    .single();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Referral link not found" }, { status: 404 });
  }

  const paymentAmount = Number(payment_amount_usd);
  let commission: number;
  if (overrideCommission !== undefined && overrideCommission !== null) {
    commission = Number(overrideCommission);
  } else if (link.commission_type === "flat") {
    commission = Number(link.flat_amount_usd ?? 0);
  } else {
    commission = paymentAmount * Number(link.commission_rate ?? 0);
  }

  // Look up conversion if user_id supplied
  let conversionId: string | null = null;
  if (user_id) {
    const { data: conv } = await svc
      .from("referral_conversions")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();
    conversionId = conv?.id ?? null;
  }

  const { data, error } = await svc
    .from("referral_earnings")
    .insert({
      referral_link_id,
      conversion_id: conversionId,
      user_id: user_id ?? null,
      payment_source: "manual",
      payment_reference: payment_reference ?? null,
      payment_amount_usd: paymentAmount,
      commission_usd: commission,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
