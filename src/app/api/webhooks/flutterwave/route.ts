import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { flutterwavePlanToTier, PLAN_PRICING, type PlanTier } from "@/src/lib/plans";
import { sendPlanUpgradeEmail } from "@/src/lib/email";
import { createNotification } from "@/src/lib/notifications";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import {
  verifyWebhookSignature,
  verifyTransaction,
} from "@/src/lib/payments/flutterwave";

// tx_ref format from initialize: conduikt-<tier>-<userId>-<uuid>
// userId is a UUID (5 dash-separated segments) so splitting on "-" needs care.
function parseTxRef(ref: string | null | undefined): { tier: PlanTier; userId: string } | null {
  if (!ref) return null;
  const match = /^conduikt-(pro|growth|agency)-([0-9a-f-]{36})-/i.exec(ref);
  if (!match) return null;
  return { tier: match[1] as PlanTier, userId: match[2] };
}

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
    id?: number | string;
    status?: string;
    tx_ref?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    customer?: {
      id?: number | string;
      email?: string;
      name?: string | { first?: string; last?: string };
      meta?: Record<string, unknown>;
    };
    payment_plan?: number | string;
    meta?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
  meta_data?: Record<string, unknown>;
}

// The previous GET handler exposed masked env status (which envs are set,
// plan IDs) to anyone who hit the URL. That was useful at initial setup but
// became information disclosure once billing went live. Removed — verify
// env vars in the Vercel dashboard directly. The webhook itself is POST-only
// with signature verification.

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
      // v3 used data.tx_ref + data.status: "successful"
      // v4 uses data.reference + data.status: "succeeded"
      const reference = data.reference ?? data.tx_ref;
      const status = data.status ?? "";
      trace.reference = reference ?? null;
      trace.payloadStatus = status;

      const successStatuses = ["successful", "succeeded", "success"];
      if (!successStatuses.includes(status.toLowerCase())) {
        trace.stop = `status not successful: ${status}`;
        break;
      }

      // Parse tier + userId from the reference string we set in initialize.
      // This is more reliable than meta (which v4 strips) or payment_plan
      // (which v4 doesn't include in the webhook).
      const parsed = parseTxRef(reference);
      trace.parsedRef = parsed;

      // Fallback: if reference parsing failed, try meta and payment_plan (legacy v3)
      let tier: PlanTier | null = parsed?.tier ?? null;
      let userId: string | null = parsed?.userId ?? null;

      if (!tier || !userId) {
        const metaFromPayload = (data.meta ??
          payload.meta ??
          payload.meta_data ??
          {}) as Record<string, unknown>;
        if (!userId) userId = (metaFromPayload.user_id as string) ?? null;
        if (!tier) {
          const planKey = metaFromPayload.plan_key as string | undefined;
          if (planKey === "pro" || planKey === "growth" || planKey === "agency") {
            tier = planKey;
          }
        }
        if (!tier && data.payment_plan) {
          const mapped = flutterwavePlanToTier(data.payment_plan);
          if (mapped !== "free") tier = mapped;
        }
      }

      trace.tier = tier;
      trace.userId = userId;

      if (!userId || !tier) {
        trace.stop = `could not derive tier/userId from reference "${reference}" or meta/payment_plan`;
        break;
      }

      // Amount/currency sanity check (Flutterwave best practice).
      const expectedAmount = PLAN_PRICING[tier].price;
      const actualAmount = typeof data.amount === "number" ? data.amount : 0;
      const currency = data.currency ?? "";
      trace.amountExpected = expectedAmount;
      trace.amountActual = actualAmount;
      trace.currency = currency;
      if (actualAmount < expectedAmount) {
        trace.stop = `amount mismatch: charged ${actualAmount}, expected ${expectedAmount}`;
        break;
      }
      if (currency && currency !== "USD") {
        trace.stop = `currency mismatch: got ${currency}, expected USD`;
        break;
      }

      // Best-effort verify — if it fails we still trust the webhook since
      // the reference is opaque to external callers and we've matched the signature.
      let customerId: string | null = null;
      let email = "";
      if (data.id !== undefined) {
        const verified = await verifyTransaction(data.id);
        if (verified) {
          trace.verifyStatus = verified.status;
          customerId = verified.customer?.id ? String(verified.customer.id) : null;
          email = verified.customer?.email ?? "";
        } else {
          trace.verifyStatus = "verify call returned null (non-fatal)";
        }
      }

      // Webhook-level customer info as fallback
      if (!customerId && data.customer?.id) customerId = String(data.customer.id);
      if (!email && data.customer?.email) email = data.customer.email;

      const { data: existing } = await supabase
        .from("profiles")
        .select("plan, payment_subscription_id, referred_via")
        .eq("id", userId)
        .maybeSingle();

      const isUpgrade = existing?.plan !== tier;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          plan: tier,
          payment_provider: "flutterwave",
          payment_customer_id: customerId,
          payment_subscription_id: customerId ? `${customerId}:${tier}` : null,
          payment_plan_code: tier,
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
      trace.isUpgrade = isUpgrade;

      // Referral commission — first paid upgrade only. Non-fatal on failure.
      if (existing?.referred_via) {
        try {
          const { data: conversion } = await supabase
            .from("referral_conversions")
            .select("id, first_paid_at")
            .eq("user_id", userId)
            .maybeSingle();

          if (conversion && !conversion.first_paid_at) {
            const { data: link } = await supabase
              .from("referral_links")
              .select("id, active, commission_type, commission_rate, flat_amount_usd")
              .eq("id", existing.referred_via)
              .maybeSingle();

            if (link?.active) {
              const commission =
                link.commission_type === "flat"
                  ? Number(link.flat_amount_usd ?? 0)
                  : actualAmount * Number(link.commission_rate ?? 0);

              const { error: earningError } = await supabase
                .from("referral_earnings")
                .insert({
                  referral_link_id: link.id,
                  conversion_id: conversion.id,
                  user_id: userId,
                  payment_source: "flutterwave",
                  payment_reference: reference ?? null,
                  payment_amount_usd: actualAmount,
                  commission_usd: commission,
                });

              if (!earningError) {
                await supabase
                  .from("referral_conversions")
                  .update({
                    first_paid_at: new Date().toISOString(),
                    current_plan: tier,
                  })
                  .eq("id", conversion.id);
                trace.referralCredited = { commission, linkId: link.id };
              } else {
                trace.referralError = earningError.message;
              }
            }
          }
        } catch (err) {
          trace.referralError = err instanceof Error ? err.message : "unknown";
        }
      }

      if (isUpgrade && email) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const name =
          userData?.user?.user_metadata?.full_name ??
          userData?.user?.user_metadata?.name ??
          "";
        sendPlanUpgradeEmail(email, tier, name).catch(() => {});
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

  console.log("[flutterwave-webhook] trace:", JSON.stringify(trace));
  return NextResponse.json(trace);
}
