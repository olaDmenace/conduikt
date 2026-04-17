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
  type?: FlutterwaveEventType;
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
  meta?: Record<string, unknown>;
}

// GET returns a health check + masked env status so you can verify deployment
// from a browser without needing Flutterwave to actually fire a webhook.
export async function GET() {
  const mask = (v: string | undefined) =>
    !v ? null : v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : "set";
  return NextResponse.json({
    ok: true,
    route: "/api/webhooks/flutterwave",
    env: {
      FLUTTERWAVE_SECRET_KEY: mask(process.env.FLUTTERWAVE_SECRET_KEY),
      FLUTTERWAVE_WEBHOOK_SECRET_HASH: mask(
        process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH
      ),
      FLUTTERWAVE_PLAN_PRO: process.env.FLUTTERWAVE_PLAN_PRO ?? null,
      FLUTTERWAVE_PLAN_GROWTH: process.env.FLUTTERWAVE_PLAN_GROWTH ?? null,
      FLUTTERWAVE_PLAN_AGENCY: process.env.FLUTTERWAVE_PLAN_AGENCY ?? null,
    },
  });
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
  const event = payload.event ?? payload["event.type"] ?? payload.type ?? "";
  const data = payload.data ?? {};
  const trace: Record<string, unknown> = { event, received: true };

  const supabase = createServiceClient();

  switch (event) {
    case "charge.completed": {
      if (!data.id) {
        trace.stop = "no data.id";
        break;
      }
      trace.txId = data.id;

      const verified = await verifyTransaction(data.id);
      if (!verified) {
        trace.stop = "verifyTransaction returned null";
        break;
      }
      trace.verifyStatus = verified.status;
      if (verified.status !== "successful") {
        trace.stop = `verify status not successful: ${verified.status}`;
        break;
      }

      // Flutterwave's verify response sometimes nests meta; fall back to webhook payload
      const metaFromVerify = (verified.meta ?? {}) as Record<string, unknown>;
      const metaFromPayload = (data.meta ?? payload.meta ?? {}) as Record<string, unknown>;
      const userId =
        (metaFromVerify.user_id as string | undefined) ??
        (metaFromPayload.user_id as string | undefined);
      trace.userId = userId ?? null;
      trace.metaFromVerifyKeys = Object.keys(metaFromVerify);
      trace.metaFromPayloadKeys = Object.keys(metaFromPayload);
      if (!userId) {
        trace.stop = "missing user_id in meta (neither verify nor webhook payload had it)";
        break;
      }

      const rawPaymentPlan = verified.payment_plan ?? data.payment_plan;
      trace.paymentPlan = rawPaymentPlan ?? null;
      trace.envPlanIds = {
        pro: process.env.FLUTTERWAVE_PLAN_PRO ?? null,
        growth: process.env.FLUTTERWAVE_PLAN_GROWTH ?? null,
        agency: process.env.FLUTTERWAVE_PLAN_AGENCY ?? null,
      };
      const plan = rawPaymentPlan
        ? flutterwavePlanToTier(rawPaymentPlan)
        : "free";
      trace.mappedTier = plan;

      if (plan === "free") {
        trace.stop = `payment_plan ${rawPaymentPlan} did not match any FLUTTERWAVE_PLAN_* env var`;
        break;
      }

      const customerId = verified.customer?.id
        ? String(verified.customer.id)
        : null;
      const email = verified.customer?.email ?? "";

      const { data: existing } = await supabase
        .from("profiles")
        .select("plan, payment_subscription_id")
        .eq("id", userId)
        .maybeSingle();

      const isUpgrade = existing?.plan !== plan;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          plan,
          payment_provider: "flutterwave",
          payment_customer_id: customerId,
          payment_subscription_id: `${customerId}:${rawPaymentPlan}`,
          payment_plan_code: String(rawPaymentPlan ?? ""),
          generation_count: 0,
          generation_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        trace.stop = `profile update failed: ${updateError.message}`;
        break;
      }
      trace.updated = true;

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
      trace.stop = `unhandled event: ${event || "(empty)"}`;
      break;
  }

  return NextResponse.json(trace);
}
