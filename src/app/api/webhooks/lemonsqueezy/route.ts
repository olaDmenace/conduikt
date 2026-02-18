import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Use service-role client for webhook (no user auth context)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Plan variant mapping — set these in .env.local
// LEMONSQUEEZY_VARIANT_PRO=<variant_id>
// LEMONSQUEEZY_VARIANT_GROWTH=<variant_id>
// LEMONSQUEEZY_VARIANT_AGENCY=<variant_id>
const variantToPlan: Record<string, string> = {
  [process.env.LEMONSQUEEZY_VARIANT_PRO ?? ""]: "pro",
  [process.env.LEMONSQUEEZY_VARIANT_GROWTH ?? ""]: "growth",
  [process.env.LEMONSQUEEZY_VARIANT_AGENCY ?? ""]: "agency",
};

const planLimits: Record<string, number> = {
  free: 5,
  pro: 100,
  growth: 999999,
  agency: 999999,
};

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName: string = payload.meta?.event_name;
  const customData = payload.meta?.custom_data;
  const userId: string | undefined = customData?.user_id;

  if (!userId) {
    return NextResponse.json({ error: "Missing user_id in custom_data" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const attrs = payload.data?.attributes;

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated": {
      const variantId = String(attrs?.variant_id ?? "");
      const customerId = String(attrs?.customer_id ?? "");
      const subscriptionId = String(payload.data?.id ?? "");
      const status: string = attrs?.status; // active, past_due, cancelled, expired, etc.

      const plan = variantToPlan[variantId] ?? "free";
      const isActive = status === "active" || status === "on_trial";

      await supabase
        .from("profiles")
        .update({
          plan: isActive ? plan : "free",
          lemon_squeezy_customer_id: customerId,
          lemon_squeezy_subscription_id: subscriptionId,
          lemon_squeezy_variant_id: variantId,
          // Reset generation count on new subscription or plan change
          ...(eventName === "subscription_created" ? { generation_count: 0 } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      // Downgrade to free
      await supabase
        .from("profiles")
        .update({
          plan: "free",
          lemon_squeezy_variant_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      break;
    }

    case "subscription_payment_success": {
      // Reset monthly generation count on successful payment
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

    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
