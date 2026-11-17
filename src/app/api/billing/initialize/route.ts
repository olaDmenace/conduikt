import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import {
  getFlutterwavePlanId,
  getPaystackPlanCode,
  isLocalPlanEnabled,
  planCurrency,
  PLAN_PRICING,
  type PlanTier,
} from "@/src/lib/plans";
import { initPayment as initFlutterwavePayment } from "@/src/lib/payments/flutterwave";
import { initPaystackPayment } from "@/src/lib/payments/paystack";

// Which provider is preferred. The other becomes the auto-failover.
// Set PAYMENT_PRIMARY_PROVIDER=paystack on Vercel to flip — no code change.
// Default = flutterwave (current production behaviour). When the user is
// ready to make Paystack primary, they update Vercel env + redeploy.
type PaymentProvider = "paystack" | "flutterwave";

function getPrimaryProvider(): PaymentProvider {
  return process.env.PAYMENT_PRIMARY_PROVIDER?.toLowerCase() === "paystack"
    ? "paystack"
    : "flutterwave";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planKey } = (await request.json().catch(() => ({}))) as { planKey?: string };
  if (!planKey || !["local", "pro", "growth", "agency"].includes(planKey)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const tier = planKey as PlanTier;
  // Each tier is charged in its own currency: naira for Local, dollars
  // for the rest. The Local tier is only offered once it can be bought
  // (a Local plan id exists with either provider; see isLocalPlanEnabled).
  const amount = PLAN_PRICING[tier].price;
  const currency = planCurrency(tier);
  if (!amount) {
    return NextResponse.json({ error: "Invalid plan price" }, { status: 500 });
  }
  if (tier === "local" && !isLocalPlanEnabled()) {
    return NextResponse.json({ error: "The Local plan is not available yet" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Try the primary provider first; on any error, fall through to the other.
  // We log every attempt so observability shows which provider served the
  // checkout (useful for debugging and for the launch-day dashboard).
  const primary = getPrimaryProvider();
  const order: PaymentProvider[] =
    primary === "paystack" ? ["paystack", "flutterwave"] : ["flutterwave", "paystack"];

  const errors: Array<{ provider: PaymentProvider; error: string }> = [];

  for (const provider of order) {
    try {
      if (provider === "paystack") {
        const planCode = getPaystackPlanCode(tier);
        if (!planCode) {
          errors.push({ provider, error: "Paystack plan not configured" });
          continue;
        }
        if (!user.email) {
          errors.push({ provider, error: "User has no email on record" });
          continue;
        }

        const { authorizationUrl, reference } = await initPaystackPayment({
          customerEmail: user.email,
          planCode,
          callbackUrl: `${appUrl}/settings/billing?payment=success`,
          metadata: {
            user_id: user.id,
            plan_key: tier,
            currency,
          },
        });

        return NextResponse.json({
          provider: "paystack",
          checkout_url: authorizationUrl,
          tx_ref: reference,
        });
      }

      // Flutterwave path. The charge goes out in the tier's own currency
      // and the webhook (src/app/api/webhooks/flutterwave/route.ts)
      // checks the amount against that same currency.
      const planId = getFlutterwavePlanId(tier);
      if (!planId) {
        errors.push({ provider, error: "Flutterwave plan not configured" });
        continue;
      }

      const txRef = `conduikt-${tier}-${user.id}-${randomUUID()}`;
      const { link } = await initFlutterwavePayment({
        txRef,
        amount,
        currency,
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[billing/initialize] ${provider} error:`, msg);
      errors.push({ provider, error: msg });
      // Don't return — continue to the next provider in the failover order.
    }
  }

  // Both providers failed.
  console.error("[billing/initialize] All providers failed:", errors);
  return NextResponse.json(
    {
      error:
        "Payment is temporarily unavailable. We're on it — please try again in a few minutes or email hello@conduikt.com.",
    },
    { status: 502 }
  );
}
