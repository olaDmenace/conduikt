import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getPaystackPlanCode, type PlanTier } from "@/src/lib/plans";

const PAYSTACK_API = "https://api.paystack.co";

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

  const planCode = getPaystackPlanCode(planKey as PlanTier);
  if (!planCode) {
    return NextResponse.json(
      { error: "Plan not configured. Contact support." },
      { status: 500 }
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Payment provider not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      plan: planCode,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
      },
      callback_url: `${appUrl}/settings/billing?payment=success`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[billing/initialize] Paystack error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 502 }
    );
  }

  const data = await res.json();

  if (!data.status || !data.data) {
    return NextResponse.json(
      { error: "Unexpected response from payment provider" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    access_code: data.data.access_code,
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
  });
}
