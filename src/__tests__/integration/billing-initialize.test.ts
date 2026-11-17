import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/billing/initialize
//
// Picks the primary provider from PAYMENT_PRIMARY_PROVIDER (default
// flutterwave) and fails over to the other when the primary throws or is not
// configured. Both provider SDK wrappers are mocked; the route's own
// validation and ordering logic is real.
// ---------------------------------------------------------------------------

const initFlutterwaveMock = vi.fn();
vi.mock("@/src/lib/payments/flutterwave", () => ({
  initPayment: (...args: unknown[]) => initFlutterwaveMock(...args),
}));

const initPaystackMock = vi.fn();
vi.mock("@/src/lib/payments/paystack", () => ({
  initPaystackPayment: (...args: unknown[]) => initPaystackMock(...args),
}));

const authGetUserMock = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: authGetUserMock } }),
}));

const USER = { id: "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d", email: "pay@example.com" };

function post(body: unknown) {
  return new Request("http://localhost/api/billing/initialize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function route() {
  return import("@/src/app/api/billing/initialize/route");
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.PAYMENT_PRIMARY_PROVIDER;
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
  process.env.FLUTTERWAVE_PLAN_PRO = "fw-pro";
  process.env.FLUTTERWAVE_PLAN_GROWTH = "fw-growth";
  process.env.FLUTTERWAVE_PLAN_AGENCY = "fw-agency";
  process.env.PAYSTACK_PLAN_PRO = "PLN_pro";
  process.env.PAYSTACK_PLAN_GROWTH = "PLN_growth";
  process.env.PAYSTACK_PLAN_AGENCY = "PLN_agency";
  authGetUserMock.mockResolvedValue({ data: { user: USER }, error: null });
  initFlutterwaveMock.mockResolvedValue({ link: "https://checkout.flutterwave.com/x" });
  initPaystackMock.mockResolvedValue({
    authorizationUrl: "https://checkout.paystack.com/y",
    reference: "ps-ref-1",
    accessCode: "ac-1",
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("POST /api/billing/initialize — validation", () => {
  it("returns 401 when not signed in", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await route();
    const res = await POST(post({ planKey: "pro" }) as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(initFlutterwaveMock).not.toHaveBeenCalled();
    expect(initPaystackMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown plan", async () => {
    const { POST } = await route();
    const res = await POST(post({ planKey: "enterprise" }) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid plan" });
  });

  it("returns 400 for the free plan (nothing to charge)", async () => {
    const { POST } = await route();
    const res = await POST(post({ planKey: "free" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 for the local plan while no local plan id is configured", async () => {
    delete process.env.FLUTTERWAVE_PLAN_LOCAL;
    delete process.env.PAYSTACK_PLAN_LOCAL;
    const { POST } = await route();
    const res = await POST(post({ planKey: "local" }) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "The Local plan is not available yet" });
    expect(initFlutterwaveMock).not.toHaveBeenCalled();
    expect(initPaystackMock).not.toHaveBeenCalled();
  });

  it("returns 400 when planKey is missing", async () => {
    const { POST } = await route();
    const res = await POST(post({}) as never);
    expect(res.status).toBe(400);
    expect(initFlutterwaveMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/billing/initialize — provider selection", () => {
  it("defaults to Flutterwave and returns its checkout link", async () => {
    const { POST } = await route();
    const res = await POST(post({ planKey: "pro" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("flutterwave");
    expect(body.checkout_url).toBe("https://checkout.flutterwave.com/x");
    expect(body.tx_ref).toMatch(
      new RegExp(`^conduikt-pro-${USER.id}-[0-9a-f-]{36}$`)
    );
    expect(initPaystackMock).not.toHaveBeenCalled();

    const args = initFlutterwaveMock.mock.calls[0][0];
    expect(args).toMatchObject({
      amount: 49,
      currency: "USD",
      customerEmail: USER.email,
      paymentPlanId: "fw-pro",
      redirectUrl: "https://app.test/settings/billing?payment=success",
      meta: { user_id: USER.id, plan_key: "pro" },
    });
    expect(args.txRef).toBe(body.tx_ref);
  });

  it("charges the tier's price (growth = 99, agency = 249)", async () => {
    const { POST } = await route();
    await POST(post({ planKey: "growth" }) as never);
    await POST(post({ planKey: "agency" }) as never);
    expect(initFlutterwaveMock.mock.calls[0][0].amount).toBe(99);
    expect(initFlutterwaveMock.mock.calls[1][0].amount).toBe(249);
  });

  it("charges the local plan in naira once FLUTTERWAVE_PLAN_LOCAL is set", async () => {
    process.env.FLUTTERWAVE_PLAN_LOCAL = "fw-local";
    const { POST } = await route();
    const res = await POST(post({ planKey: "local" }) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).provider).toBe("flutterwave");
    expect(initFlutterwaveMock.mock.calls[0][0]).toMatchObject({
      amount: 15000,
      currency: "NGN",
      paymentPlanId: "fw-local",
      meta: { user_id: USER.id, plan_key: "local" },
    });
  });

  it("uses Paystack first when PAYMENT_PRIMARY_PROVIDER=paystack", async () => {
    process.env.PAYMENT_PRIMARY_PROVIDER = "Paystack"; // case-insensitive
    const { POST } = await route();
    const res = await POST(post({ planKey: "growth" }) as never);
    const body = await res.json();
    expect(body).toEqual({
      provider: "paystack",
      checkout_url: "https://checkout.paystack.com/y",
      tx_ref: "ps-ref-1",
    });
    expect(initFlutterwaveMock).not.toHaveBeenCalled();
    expect(initPaystackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: USER.email,
        planCode: "PLN_growth",
        callbackUrl: "https://app.test/settings/billing?payment=success",
        metadata: expect.objectContaining({
          user_id: USER.id,
          plan_key: "growth",
          currency: "USD",
        }),
      })
    );
  });

  it("treats any other PAYMENT_PRIMARY_PROVIDER value as flutterwave", async () => {
    process.env.PAYMENT_PRIMARY_PROVIDER = "stripe";
    const { POST } = await route();
    const body = await (await POST(post({ planKey: "pro" }) as never)).json();
    expect(body.provider).toBe("flutterwave");
  });
});

describe("POST /api/billing/initialize — failover", () => {
  it("falls over to Paystack when Flutterwave throws", async () => {
    initFlutterwaveMock.mockRejectedValueOnce(new Error("Flutterwave init failed: 503"));
    const { POST } = await route();
    const res = await POST(post({ planKey: "pro" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("paystack");
    expect(initFlutterwaveMock).toHaveBeenCalledTimes(1);
    expect(initPaystackMock).toHaveBeenCalledTimes(1);
  });

  it("falls over to Flutterwave when Paystack is primary and throws", async () => {
    process.env.PAYMENT_PRIMARY_PROVIDER = "paystack";
    initPaystackMock.mockRejectedValueOnce(new Error("Paystack init failed: 500"));
    const { POST } = await route();
    const body = await (await POST(post({ planKey: "pro" }) as never)).json();
    expect(body.provider).toBe("flutterwave");
    expect(initPaystackMock).toHaveBeenCalledTimes(1);
    expect(initFlutterwaveMock).toHaveBeenCalledTimes(1);
  });

  it("skips an unconfigured primary without calling it", async () => {
    delete process.env.FLUTTERWAVE_PLAN_PRO;
    const { POST } = await route();
    const body = await (await POST(post({ planKey: "pro" }) as never)).json();
    expect(body.provider).toBe("paystack");
    expect(initFlutterwaveMock).not.toHaveBeenCalled();
  });

  it("skips Paystack when the user has no email on record", async () => {
    process.env.PAYMENT_PRIMARY_PROVIDER = "paystack";
    authGetUserMock.mockResolvedValueOnce({ data: { user: { id: USER.id } }, error: null });
    const { POST } = await route();
    const body = await (await POST(post({ planKey: "pro" }) as never)).json();
    expect(body.provider).toBe("flutterwave");
    expect(initPaystackMock).not.toHaveBeenCalled();
  });

  it("returns 502 with a human message when both providers fail", async () => {
    initFlutterwaveMock.mockRejectedValueOnce(new Error("fw down"));
    initPaystackMock.mockRejectedValueOnce(new Error("ps down"));
    const { POST } = await route();
    const res = await POST(post({ planKey: "pro" }) as never);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("temporarily unavailable");
    expect(initFlutterwaveMock).toHaveBeenCalledTimes(1);
    expect(initPaystackMock).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when neither provider has a plan configured", async () => {
    delete process.env.FLUTTERWAVE_PLAN_AGENCY;
    delete process.env.PAYSTACK_PLAN_AGENCY;
    const { POST } = await route();
    const res = await POST(post({ planKey: "agency" }) as never);
    expect(res.status).toBe(502);
    expect(initFlutterwaveMock).not.toHaveBeenCalled();
    expect(initPaystackMock).not.toHaveBeenCalled();
  });
});
