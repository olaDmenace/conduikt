import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// POST /api/webhooks/paystack
//
// Paystack signs the raw body with HMAC-SHA512 using the secret key and sends
// the hex digest in `x-paystack-signature`. Plan codes map to tiers through
// PAYSTACK_PLAN_{PRO,GROWTH,AGENCY}; anything else resolves to "free".
// ---------------------------------------------------------------------------

const sendPlanUpgradeEmailMock = vi.fn();
vi.mock("@/src/lib/email", () => ({
  sendPlanUpgradeEmail: (...args: unknown[]) => sendPlanUpgradeEmailMock(...args),
}));

const createNotificationMock = vi.fn();
vi.mock("@/src/lib/notifications", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

const fromMock = vi.fn();
const getUserByIdMock = vi.fn();
const supabase = { from: fromMock, auth: { admin: { getUserById: getUserByIdMock } } };
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => supabase,
}));

const SECRET = "sk_test_paystack_secret";
const USER_ID = "6b1c3d5e-7f80-4a91-b2c3-d4e5f6a7b8c9";

function sign(rawBody: string, secret = SECRET) {
  return crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
}

let ipCounter = 0;
function post(rawBody: string, signature?: string) {
  ipCounter++;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": `10.1.0.${ipCounter}`,
  };
  if (signature !== undefined) headers["x-paystack-signature"] = signature;
  return new Request("http://localhost/api/webhooks/paystack", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

function signedPost(payload: unknown) {
  const raw = JSON.stringify(payload);
  return post(raw, sign(raw));
}

type Update = { row: Record<string, unknown>; filter: unknown[] };
function setupProfiles(opts: { lookup?: Record<string, unknown> | null } = {}) {
  const updates: Update[] = [];
  fromMock.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: opts.lookup ?? null, error: null }),
        update: vi.fn((row: Record<string, unknown>) => ({
          eq: vi.fn((...filter: unknown[]) => {
            updates.push({ row, filter });
            return Promise.resolve({ data: null, error: null });
          }),
        })),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
  return updates;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PAYSTACK_SECRET_KEY = SECRET;
  process.env.PAYSTACK_PLAN_PRO = "PLN_pro_123";
  process.env.PAYSTACK_PLAN_GROWTH = "PLN_growth_456";
  process.env.PAYSTACK_PLAN_AGENCY = "PLN_agency_789";
  getUserByIdMock.mockResolvedValue({
    data: { user: { user_metadata: { name: "Grace" } } },
    error: null,
  });
  sendPlanUpgradeEmailMock.mockResolvedValue(undefined);
  createNotificationMock.mockResolvedValue(undefined);
  setupProfiles();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

async function route() {
  return import("@/src/app/api/webhooks/paystack/route");
}

describe("POST /api/webhooks/paystack — signature", () => {
  it("rejects a request with no signature header", async () => {
    const { POST } = await route();
    const res = await POST(post(JSON.stringify({ event: "charge.success" })) as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid signature" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects a signature made with a different secret", async () => {
    const raw = JSON.stringify({ event: "charge.success" });
    const { POST } = await route();
    const res = await POST(post(raw, sign(raw, "sk_test_wrong")) as never);
    expect(res.status).toBe(401);
  });

  it("rejects a valid signature over a different body (tamper check)", async () => {
    const raw = JSON.stringify({ event: "subscription.create", data: { metadata: { user_id: USER_ID } } });
    const tampered = JSON.stringify({ event: "subscription.create", data: { metadata: { user_id: "attacker" } } });
    const { POST } = await route();
    const res = await POST(post(tampered, sign(raw)) as never);
    expect(res.status).toBe(401);
  });

  it("rejects a malformed (non-hex, wrong length) signature without throwing", async () => {
    const raw = JSON.stringify({ event: "charge.success" });
    const { POST } = await route();
    const res = await POST(post(raw, "not-a-real-signature") as never);
    expect(res.status).toBe(401);
  });

  it("rejects everything when PAYSTACK_SECRET_KEY is missing", async () => {
    const raw = JSON.stringify({ event: "charge.success" });
    const sig = sign(raw);
    delete process.env.PAYSTACK_SECRET_KEY;
    const { POST } = await route();
    const res = await POST(post(raw, sig) as never);
    expect(res.status).toBe(401);
  });

  it("accepts a correctly signed body", async () => {
    const { POST } = await route();
    const res = await POST(signedPost({ event: "some.unhandled.event", data: {} }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});

describe("plan code mapping", () => {
  it("maps each configured plan code to its tier and unknown codes to free", async () => {
    const { paystackPlanToTier, getPaystackPlanCode } = await import("@/src/lib/plans");
    expect(paystackPlanToTier("PLN_pro_123")).toBe("pro");
    expect(paystackPlanToTier("PLN_growth_456")).toBe("growth");
    expect(paystackPlanToTier("PLN_agency_789")).toBe("agency");
    expect(paystackPlanToTier("PLN_unknown")).toBe("free");
    expect(paystackPlanToTier("")).toBe("free");

    expect(getPaystackPlanCode("pro")).toBe("PLN_pro_123");
    expect(getPaystackPlanCode("growth")).toBe("PLN_growth_456");
    expect(getPaystackPlanCode("agency")).toBe("PLN_agency_789");
    expect(getPaystackPlanCode("free")).toBeNull();
  });

  it("returns null when a plan env var is not set", async () => {
    delete process.env.PAYSTACK_PLAN_GROWTH;
    const { getPaystackPlanCode, paystackPlanToTier } = await import("@/src/lib/plans");
    expect(getPaystackPlanCode("growth")).toBeNull();
    // An unset env must not accidentally match an empty plan code.
    expect(paystackPlanToTier("")).toBe("free");
  });
});

describe("POST /api/webhooks/paystack — subscription.create", () => {
  const base = {
    customer: { customer_code: "CUS_abc", email: "grace@example.com" },
    subscription_code: "SUB_xyz",
    authorization: { authorization_code: "AUTH_123" },
  };

  it("maps the plan code to the tier and stores the Paystack identifiers", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signedPost({
        event: "subscription.create",
        data: { ...base, plan: { plan_code: "PLN_growth_456" }, metadata: { user_id: USER_ID } },
      }) as never
    );
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0].filter).toEqual(["id", USER_ID]);
    expect(updates[0].row).toMatchObject({
      plan: "growth",
      payment_provider: "paystack",
      payment_customer_id: "CUS_abc",
      payment_subscription_id: "SUB_xyz",
      payment_authorization: "AUTH_123",
      payment_plan_code: "PLN_growth_456",
    });
    expect(sendPlanUpgradeEmailMock).toHaveBeenCalledWith("grace@example.com", "growth", "Grace");
  });

  it("maps pro and agency codes", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    await POST(
      signedPost({
        event: "subscription.create",
        data: { ...base, plan: { plan_code: "PLN_pro_123" }, metadata: { user_id: USER_ID } },
      }) as never
    );
    await POST(
      signedPost({
        event: "subscription.create",
        data: { ...base, plan: { plan_code: "PLN_agency_789" }, metadata: { user_id: USER_ID } },
      }) as never
    );
    expect(updates.map((u) => u.row.plan)).toEqual(["pro", "agency"]);
  });

  it("does nothing when metadata.user_id is missing", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signedPost({
        event: "subscription.create",
        data: { ...base, plan: { plan_code: "PLN_pro_123" }, metadata: {} },
      }) as never
    );
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
    expect(sendPlanUpgradeEmailMock).not.toHaveBeenCalled();
  });

  // An unrecognised plan code currently writes plan: "free" together with the
  // Paystack identifiers — the user has paid for something we cannot map, and
  // ends up on free. Reported under left_undone (a misconfigured env var in
  // production would silently downgrade every new subscriber).
  it.todo(
    "an unknown plan code should not downgrade the subscriber to free (src/app/api/webhooks/paystack/route.ts:54-67)"
  );
});

describe("POST /api/webhooks/paystack — other events", () => {
  it("charge.success on a subscription resets the generation counter", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    await POST(
      signedPost({
        event: "charge.success",
        data: { metadata: { user_id: USER_ID }, plan: { plan_code: "PLN_pro_123" } },
      }) as never
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].filter).toEqual(["id", USER_ID]);
    expect(updates[0].row).toMatchObject({ generation_count: 0 });
    expect(updates[0].row.plan).toBeUndefined();
  });

  it("charge.success without a plan object (one-off charge) is ignored", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    await POST(
      signedPost({ event: "charge.success", data: { metadata: { user_id: USER_ID } } }) as never
    );
    expect(updates).toHaveLength(0);
  });

  it("subscription.disable downgrades to free by customer code", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    await POST(
      signedPost({
        event: "subscription.disable",
        data: { customer: { customer_code: "CUS_abc" } },
      }) as never
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].filter).toEqual(["payment_customer_id", "CUS_abc"]);
    expect(updates[0].row).toMatchObject({
      plan: "free",
      payment_subscription_id: null,
      payment_authorization: null,
      payment_plan_code: null,
    });
  });

  it("subscription.not_renew also downgrades", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    await POST(
      signedPost({
        event: "subscription.not_renew",
        data: { customer: { customer_code: "CUS_abc" } },
      }) as never
    );
    expect(updates[0].row.plan).toBe("free");
  });

  it("invoice.payment_failed notifies the user and keeps the plan", async () => {
    const updates = setupProfiles({ lookup: { id: USER_ID } });
    const { POST } = await route();
    await POST(
      signedPost({
        event: "invoice.payment_failed",
        data: { customer: { customer_code: "CUS_abc" } },
      }) as never
    );
    expect(updates).toHaveLength(0);
    expect(createNotificationMock).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ type: "payment_failed" })
    );
  });

  it("unhandled events are acknowledged without touching the database", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(signedPost({ event: "transfer.success", data: {} }) as never);
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
