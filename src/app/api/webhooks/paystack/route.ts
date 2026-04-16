import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { paystackPlanToTier } from "@/src/lib/plans";
import { sendPlanUpgradeEmail } from "@/src/lib/email";
import { createNotification } from "@/src/lib/notifications";
import crypto from "crypto";

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  const hashBuffer = Buffer.from(hash, "hex");
  const sigBuffer = Buffer.from(signature, "hex");
  if (hashBuffer.length !== sigBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, sigBuffer);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event: string = payload.event;
  const data = payload.data;

  const supabase = createServiceClient();

  switch (event) {
    case "subscription.create": {
      const customerCode: string = data.customer?.customer_code ?? "";
      const subscriptionCode: string = data.subscription_code ?? "";
      const planCode: string = data.plan?.plan_code ?? "";
      const authCode: string = data.authorization?.authorization_code ?? "";
      const userId: string | undefined = data.metadata?.user_id;
      const email: string = data.customer?.email ?? "";

      if (!userId) {
        console.warn("[paystack] subscription.create missing user_id in metadata");
        break;
      }

      const plan = paystackPlanToTier(planCode);

      await supabase
        .from("profiles")
        .update({
          plan,
          payment_provider: "paystack",
          payment_customer_id: customerCode,
          payment_subscription_id: subscriptionCode,
          payment_authorization: authCode,
          payment_plan_code: planCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Send upgrade email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const name =
        userData?.user?.user_metadata?.full_name ??
        userData?.user?.user_metadata?.name ??
        "";
      if (email) {
        sendPlanUpgradeEmail(email, plan, name).catch(() => {});
      }

      break;
    }

    case "charge.success": {
      // Only handle recurring subscription charges (not the initial one)
      const userId: string | undefined = data.metadata?.user_id;
      const planObj = data.plan;

      if (!userId || !planObj) break;

      // Reset generation count on successful recurring payment
      await supabase
        .from("profiles")
        .update({
          generation_count: 0,
          generation_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      break;
    }

    case "subscription.disable":
    case "subscription.not_renew": {
      // Downgrade to free
      const customerCode: string = data.customer?.customer_code ?? "";

      if (!customerCode) break;

      await supabase
        .from("profiles")
        .update({
          plan: "free",
          payment_subscription_id: null,
          payment_authorization: null,
          payment_plan_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("payment_customer_id", customerCode);

      break;
    }

    case "invoice.payment_failed": {
      // Notify user but keep plan active (grace period)
      const customerCode: string = data.customer?.customer_code ?? "";

      if (!customerCode) break;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("payment_customer_id", customerCode)
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
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
