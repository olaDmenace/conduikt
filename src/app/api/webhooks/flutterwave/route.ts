import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { flutterwavePlanToTier } from "@/src/lib/plans";
import { sendPlanUpgradeEmail } from "@/src/lib/email";
import { createNotification } from "@/src/lib/notifications";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import {
  verifyWebhookSignature,
  verifyTransaction,
} from "@/src/lib/payments/flutterwave";

type FlutterwaveEventType =
  | "charge.completed"
  | "subscription.cancelled"
  | "subscription.disabled"
  | string;

interface FlutterwaveWebhookPayload {
  event?: FlutterwaveEventType;
  "event.type"?: FlutterwaveEventType;
  data?: {
    id?: number;
    status?: string;
    tx_ref?: string;
    amount?: number;
    currency?: string;
    customer?: { id?: number; email?: string; name?: string };
    payment_plan?: number | string;
    meta?: Record<string, unknown>;
  };
}

export async function POST(request: NextRequest) {
  // Rate limit by IP: 30 requests per minute
  const rl = rateLimit(
    `flutterwave-wh:${request.headers.get("x-forwarded-for") || "unknown"}`,
    { limit: 30, windowSeconds: 60 }
  );
  if (!rl.allowed) return rateLimitResponse(rl);

  const signature = request.headers.get("verif-hash");
  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = (await request.json()) as FlutterwaveWebhookPayload;
  const event = payload.event ?? payload["event.type"] ?? "";
  const data = payload.data ?? {};

  const supabase = createServiceClient();

  switch (event) {
    case "charge.completed": {
      // Always verify with Flutterwave's API before trusting webhook payload
      if (!data.id) break;
      const verified = await verifyTransaction(data.id);
      if (!verified || verified.status !== "successful") {
        console.warn("[flutterwave] charge.completed verification failed", {
          txRef: data.tx_ref,
          id: data.id,
        });
        break;
      }

      const userId = (verified.meta?.user_id as string | undefined) ?? undefined;
      if (!userId) {
        console.warn("[flutterwave] charge.completed missing user_id in meta");
        break;
      }

      const plan = verified.payment_plan
        ? flutterwavePlanToTier(verified.payment_plan)
        : "free";

      if (plan === "free") {
        console.warn("[flutterwave] charge.completed: unknown payment_plan", {
          paymentPlan: verified.payment_plan,
        });
        break;
      }

      const customerId = verified.customer?.id
        ? String(verified.customer.id)
        : null;
      const email = verified.customer?.email ?? "";

      // Fetch current profile to decide upgrade vs recurring charge
      const { data: existing } = await supabase
        .from("profiles")
        .select("plan, payment_subscription_id")
        .eq("id", userId)
        .maybeSingle();

      const isUpgrade = existing?.plan !== plan;

      await supabase
        .from("profiles")
        .update({
          plan,
          payment_provider: "flutterwave",
          payment_customer_id: customerId,
          // Flutterwave doesn't return a subscription ID on charge.completed;
          // the subscription is tied to customer + payment_plan.
          payment_subscription_id: `${customerId}:${verified.payment_plan}`,
          payment_plan_code: String(verified.payment_plan ?? ""),
          generation_count: 0,
          generation_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Only send upgrade email on first-time plan change, not recurring renewals
      if (isUpgrade && email) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const name =
          userData?.user?.user_metadata?.full_name ??
          userData?.user?.user_metadata?.name ??
          "";
        sendPlanUpgradeEmail(email, plan, name).catch(() => {});
      }

      break;
    }

    case "subscription.cancelled":
    case "subscription.disabled": {
      const customerId = data.customer?.id ? String(data.customer.id) : "";
      if (!customerId) break;

      await supabase
        .from("profiles")
        .update({
          plan: "free",
          payment_subscription_id: null,
          payment_plan_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("payment_customer_id", customerId);

      break;
    }

    case "charge.failed": {
      const customerId = data.customer?.id ? String(data.customer.id) : "";
      if (!customerId) break;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("payment_customer_id", customerId)
        .maybeSingle();

      if (profile) {
        await createNotification(profile.id, {
          type: "payment_failed",
          title: "Payment failed",
          body: "Your subscription payment failed. Please update your payment method to avoid losing access.",
          actionUrl: "/settings/billing",
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
