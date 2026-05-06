// Paystack hosted-checkout init wrapper. Mirrors flutterwave.ts so
// /api/billing/initialize can swap providers without changing its
// caller-facing shape. Both providers ultimately return a hosted
// checkout URL — the API route normalizes that into { checkout_url }.
//
// Paystack docs: https://paystack.com/docs/api/transaction/#initialize

const PAYSTACK_API = "https://api.paystack.co";

export interface InitPaystackArgs {
  customerEmail: string;
  /** Paystack plan code (PLN_xxx) — created in Paystack Dashboard > Plans. */
  planCode: string;
  /** Where Paystack redirects the user after the hosted checkout completes. */
  callbackUrl: string;
  /** Free-form key/value passed back via webhook. Must include user_id and plan_key. */
  metadata: Record<string, string>;
}

export interface InitPaystackResponse {
  /** Hosted checkout URL — set window.location.href to this. */
  authorizationUrl: string;
  /** Paystack's reference for the transaction. Used to verify in the callback. */
  reference: string;
  /** Short-lived access code paired with the reference. */
  accessCode: string;
}

/**
 * Initialize a Paystack hosted-checkout transaction.
 * Throws on auth/network/shape errors — the caller decides how to fail or fail over.
 */
export async function initPaystackPayment(
  args: InitPaystackArgs
): Promise<InitPaystackResponse> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY not set");

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args.customerEmail,
      plan: args.planCode,
      metadata: args.metadata,
      callback_url: args.callbackUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack init failed: ${res.status} ${text}`);
  }

  const body = (await res.json()) as {
    status?: boolean;
    data?: {
      authorization_url?: string;
      access_code?: string;
      reference?: string;
    };
  };

  if (
    body.status !== true ||
    !body.data?.authorization_url ||
    !body.data.reference ||
    !body.data.access_code
  ) {
    throw new Error("Paystack returned unexpected response shape");
  }

  return {
    authorizationUrl: body.data.authorization_url,
    reference: body.data.reference,
    accessCode: body.data.access_code,
  };
}
