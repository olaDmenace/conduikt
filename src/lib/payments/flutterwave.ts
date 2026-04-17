import crypto from "crypto";

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

export interface InitPaymentArgs {
  txRef: string;
  amount: number;
  currency: "USD";
  customerEmail: string;
  paymentPlanId: string;
  redirectUrl: string;
  meta: Record<string, string>;
}

export interface InitPaymentResponse {
  link: string;
}

/**
 * Create a payment link for a hosted checkout redirect.
 * Docs: https://developer.flutterwave.com/reference/create-payment
 */
export async function initPayment(args: InitPaymentArgs): Promise<InitPaymentResponse> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY not set");

  const res = await fetch(`${FLUTTERWAVE_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: args.txRef,
      amount: args.amount,
      currency: args.currency,
      payment_plan: args.paymentPlanId,
      redirect_url: args.redirectUrl,
      customer: { email: args.customerEmail },
      meta: args.meta,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Flutterwave init failed: ${res.status} ${text}`);
  }

  const body = (await res.json()) as { status?: string; data?: { link?: string } };
  if (body.status !== "success" || !body.data?.link) {
    throw new Error("Flutterwave returned unexpected response shape");
  }

  return { link: body.data.link };
}

/**
 * Verify webhook signature from the `verif-hash` header.
 * Flutterwave compares the header value against the plain-text webhook secret
 * you configured in the dashboard — no HMAC, just a shared-secret equality check.
 * Docs: https://developer.flutterwave.com/docs/webhooks
 */
export function verifyWebhookSignature(signatureHeader: string | null): boolean {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  if (!expected || !signatureHeader) return false;
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verify a completed transaction against Flutterwave's API before trusting
 * webhook payload. Returns the verified transaction data or null on failure.
 * Docs: https://developer.flutterwave.com/reference/verify-transaction
 */
export interface VerifiedTransaction {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
  customer: { email: string; id: number };
  payment_plan?: number | string;
  meta?: Record<string, unknown>;
}

export async function verifyTransaction(
  transactionId: string | number
): Promise<VerifiedTransaction | null> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) return null;

  const res = await fetch(`${FLUTTERWAVE_API}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { status?: string; data?: VerifiedTransaction };
  if (body.status !== "success" || !body.data) return null;
  return body.data;
}
