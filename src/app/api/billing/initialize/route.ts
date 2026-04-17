import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import { getFlutterwavePlanId, PLAN_PRICING, type PlanTier } from "@/src/lib/plans";
import { initPayment } from "@/src/lib/payments/flutterwave";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planKey } = (await request.json()) as { planKey?: string };
  if (!planKey || !["pro", "growth", "agency"].includes(planKey)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const tier = planKey as PlanTier;
  const planId = getFlutterwavePlanId(tier);
  if (!planId) {
    return NextResponse.json(
      { error: "Plan not configured. Contact support." },
      { status: 500 }
    );
  }

  const amount = PLAN_PRICING[tier].price;
  if (!amount) {
    return NextResponse.json({ error: "Invalid plan price" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const txRef = `conduikt-${tier}-${user.id}-${randomUUID()}`;

  try {
    const { link } = await initPayment({
      txRef,
      amount,
      currency: "USD",
      customerEmail: user.email ?? "",
      paymentPlanId: planId,
      redirectUrl: `${appUrl}/settings/billing?payment=success`,
      meta: {
        user_id: user.id,
        plan_key: tier,
      },
    });

    return NextResponse.json({
      provider: "flutterwave",
      checkout_url: link,
      tx_ref: txRef,
    });
  } catch (err) {
    console.error("[billing/initialize] Flutterwave error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 502 }
    );
  }
}
