import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// POST /api/webhooks/flutterwave
//
// Signature is a plain shared-secret match on the `verif-hash` header (not an
// HMAC). The real verifyWebhookSignature is kept; only the network call
// (verifyTransaction) is mocked. Payload quirks under test come from
// memory/reference_flutterwave_webhook_quirks.md:
//   - v3: data.tx_ref + status "successful"; metadata echoes back as
//     top-level `meta_data` (NOT `meta`)
//   - v4: data.reference + status "succeeded"; meta stripped, payment_plan absent
//   - tx_ref `conduikt-<tier>-<userId>-<uuid>` is the canonical tier carrier
// ---------------------------------------------------------------------------

const verifyTransactionMock = vi.fn();
vi.mock("@/src/lib/payments/flutterwave", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/payments/flutterwave")>(
    "@/src/lib/payments/flutterwave"
  );
  return {
    ...actual,
    verifyTransaction: (...args: unknown[]) => verifyTransactionMock(...args),
  };
});

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

const SECRET = "fw-webhook-secret-hash";
const USER_ID = "0f8a1c2e-3b4d-4e5f-8a6b-7c8d9e0f1a2b";
const TX_REF_PRO = `conduikt-pro-${USER_ID}-9c1f0f6e-1111-4222-8333-444455556666`;

// Each request gets its own IP so the in-memory rate limiter (30/min per IP)
// never trips across tests in this file.
let ipCounter = 0;
function post(body: unknown, headers: Record<string, string> = {}) {
  ipCounter++;
  return new Request("http://localhost/api/webhooks/flutterwave", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.0.0.${ipCounter}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function signed(body: unknown) {
  return post(body, { "verif-hash": SECRET });
}

// Records every profiles.update() payload and the .eq() filter that followed.
interface ProfilesState {
  existing?: Record<string, unknown> | null;
  updateError?: { message: string } | null;
}
function profilesChain(state: ProfilesState, updates: Array<{ row: Record<string, unknown>; filter: unknown[] }>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: state.existing ?? null, error: null }),
    update: vi.fn((row: Record<string, unknown>) => ({
      eq: vi.fn((...filter: unknown[]) => {
        updates.push({ row, filter });
        return Promise.resolve({ data: null, error: state.updateError ?? null });
      }),
    })),
  };
}

function defaultChain() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function setupProfiles(state: ProfilesState = {}) {
  const updates: Array<{ row: Record<string, unknown>; filter: unknown[] }> = [];
  fromMock.mockImplementation((table: string) => {
    if (table === "profiles") return profilesChain(state, updates);
    return defaultChain();
  });
  return updates;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = SECRET;
  process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-xyz";
  process.env.FLUTTERWAVE_PLAN_PRO = "11111";
  process.env.FLUTTERWAVE_PLAN_GROWTH = "22222";
  process.env.FLUTTERWAVE_PLAN_AGENCY = "33333";
  verifyTransactionMock.mockResolvedValue(null);
  getUserByIdMock.mockResolvedValue({
    data: { user: { user_metadata: { full_name: "Ada Lovelace" } } },
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
  return import("@/src/app/api/webhooks/flutterwave/route");
}

describe("POST /api/webhooks/flutterwave — signature", () => {
  it("rejects a request with no verif-hash header", async () => {
    const { POST } = await route();
    const res = await POST(post({ event: "charge.completed" }) as never);
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects a wrong verif-hash", async () => {
    const { POST } = await route();
    const res = await POST(post({ event: "charge.completed" }, { "verif-hash": "nope" }) as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid signature" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects a hash that matches on prefix only (length check)", async () => {
    const { POST } = await route();
    const res = await POST(
      post({ event: "charge.completed" }, { "verif-hash": SECRET + "x" }) as never
    );
    expect(res.status).toBe(401);
  });

  it("rejects everything when the secret env is not configured", async () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    const { POST } = await route();
    const res = await POST(signed({ event: "charge.completed" }) as never);
    expect(res.status).toBe(401);
  });

  it("accepts the configured secret", async () => {
    const { POST } = await route();
    const res = await POST(signed({ event: "something.else" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.stop).toContain("unhandled event");
  });
});

describe("POST /api/webhooks/flutterwave — charge.completed", () => {
  it("v3 payload (tx_ref + 'successful') upgrades the plan from the tx_ref", async () => {
    const updates = setupProfiles({ existing: { plan: "free", referred_via: null } });
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: {
          id: 987,
          tx_ref: TX_REF_PRO,
          status: "successful",
          amount: 49,
          currency: "USD",
          customer: { id: 555, email: "ada@example.com" },
        },
      }) as never
    );
    expect(res.status).toBe(200);
    const trace = await res.json();
    expect(trace.updated).toBe(true);
    expect(trace.isUpgrade).toBe(true);
    expect(trace.tier).toBe("pro");
    expect(trace.userId).toBe(USER_ID);

    expect(updates).toHaveLength(1);
    expect(updates[0].filter).toEqual(["id", USER_ID]);
    expect(updates[0].row).toMatchObject({
      plan: "pro",
      payment_provider: "flutterwave",
      payment_customer_id: "555",
      payment_subscription_id: "555:pro",
      payment_plan_code: "pro",
      generation_count: 0,
    });
    expect(sendPlanUpgradeEmailMock).toHaveBeenCalledWith("ada@example.com", "pro", "Ada Lovelace");
  });

  it("v4 payload (reference + 'succeeded', meta stripped) upgrades the plan", async () => {
    const updates = setupProfiles({ existing: { plan: "free" } });
    const { POST } = await route();
    const res = await POST(
      signed({
        type: "charge.completed", // v4 puts the event name under `type`
        data: {
          id: "txn_v4",
          reference: `conduikt-growth-${USER_ID}-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee`,
          status: "succeeded",
          amount: 99,
          currency: "USD",
          customer: { id: "cus_1", email: "ada@example.com" },
        },
      }) as never
    );
    const trace = await res.json();
    expect(trace.updated).toBe(true);
    expect(trace.tier).toBe("growth");
    expect(updates[0].row.plan).toBe("growth");
  });

  it("v3 quirk: falls back to top-level meta_data (not meta) when tx_ref is not ours", async () => {
    const updates = setupProfiles({ existing: { plan: "free" } });
    const { POST } = await route();
    const res = await POST(
      signed({
        "event.type": "charge.completed",
        data: {
          id: 1,
          tx_ref: "legacy-ref-with-no-tier",
          status: "SUCCESSFUL", // case-insensitive
          amount: 99,
          currency: "USD",
          customer: { id: 7, email: "ada@example.com" },
        },
        meta_data: { user_id: USER_ID, plan_key: "growth" },
      }) as never
    );
    const trace = await res.json();
    expect(trace.parsedRef).toBeNull();
    expect(trace.tier).toBe("growth");
    expect(trace.userId).toBe(USER_ID);
    expect(trace.updated).toBe(true);
    expect(updates[0].row.plan).toBe("growth");
  });

  it("v3 quirk: resolves tier from payment_plan when meta has user_id only", async () => {
    const updates = setupProfiles({ existing: { plan: "free" } });
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: {
          id: 2,
          tx_ref: "legacy-ref",
          status: "successful",
          amount: 249,
          currency: "USD",
          payment_plan: 33333, // FLUTTERWAVE_PLAN_AGENCY
          meta: { user_id: USER_ID },
        },
      }) as never
    );
    const trace = await res.json();
    expect(trace.tier).toBe("agency");
    expect(updates[0].row.plan).toBe("agency");
  });

  it("stops when neither tx_ref nor meta identifies the user", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: { id: 3, tx_ref: "unknown", status: "successful", amount: 49, currency: "USD" },
      }) as never
    );
    const trace = await res.json();
    expect(trace.stop).toContain("could not derive tier/userId");
    expect(updates).toHaveLength(0);
  });

  it("ignores a non-successful status", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: { id: 4, tx_ref: TX_REF_PRO, status: "failed", amount: 49, currency: "USD" },
      }) as never
    );
    const trace = await res.json();
    expect(trace.stop).toContain("status not successful");
    expect(updates).toHaveLength(0);
    expect(sendPlanUpgradeEmailMock).not.toHaveBeenCalled();
  });

  it("refuses an underpaid charge", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: { id: 5, tx_ref: TX_REF_PRO, status: "successful", amount: 5, currency: "USD" },
      }) as never
    );
    const trace = await res.json();
    expect(trace.stop).toContain("amount mismatch");
    expect(updates).toHaveLength(0);
  });

  it("refuses a non-USD charge", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: { id: 6, tx_ref: TX_REF_PRO, status: "successful", amount: 49, currency: "NGN" },
      }) as never
    );
    const trace = await res.json();
    expect(trace.stop).toContain("currency mismatch");
    expect(updates).toHaveLength(0);
  });

  it("prefers the verified transaction's customer over the webhook body", async () => {
    verifyTransactionMock.mockResolvedValueOnce({
      id: 987,
      tx_ref: TX_REF_PRO,
      status: "successful",
      amount: 49,
      currency: "USD",
      customer: { id: 999, email: "verified@example.com" },
    });
    const updates = setupProfiles({ existing: { plan: "free" } });
    const { POST } = await route();
    await POST(
      signed({
        event: "charge.completed",
        data: {
          id: 987,
          tx_ref: TX_REF_PRO,
          status: "successful",
          amount: 49,
          currency: "USD",
          customer: { id: 1, email: "body@example.com" },
        },
      }) as never
    );
    expect(verifyTransactionMock).toHaveBeenCalledWith(987);
    expect(updates[0].row.payment_customer_id).toBe("999");
    expect(sendPlanUpgradeEmailMock).toHaveBeenCalledWith("verified@example.com", "pro", "Ada Lovelace");
  });

  it("reports a profile update failure in the trace", async () => {
    setupProfiles({ existing: { plan: "free" }, updateError: { message: "db down" } });
    const { POST } = await route();
    const res = await POST(
      signed({
        event: "charge.completed",
        data: { id: 8, tx_ref: TX_REF_PRO, status: "successful", amount: 49, currency: "USD" },
      }) as never
    );
    const trace = await res.json();
    expect(trace.updated).toBeUndefined();
    expect(trace.stop).toContain("profile update failed");
  });
});

describe("POST /api/webhooks/flutterwave — duplicate deliveries", () => {
  const payload = {
    event: "charge.completed",
    data: {
      id: 42,
      tx_ref: TX_REF_PRO,
      status: "successful",
      amount: 49,
      currency: "USD",
      customer: { id: 555, email: "ada@example.com" },
    },
  };

  it("a replayed charge.completed does not send a second upgrade email", async () => {
    // First delivery: user is on free.
    setupProfiles({ existing: { plan: "free" } });
    const { POST } = await route();
    const first = await (await POST(signed(payload) as never)).json();
    expect(first.isUpgrade).toBe(true);
    expect(sendPlanUpgradeEmailMock).toHaveBeenCalledTimes(1);

    // Replay: profile already reflects the plan.
    setupProfiles({ existing: { plan: "pro" } });
    const second = await (await POST(signed(payload) as never)).json();
    expect(second.updated).toBe(true); // write is a no-op re-set, same end state
    expect(second.isUpgrade).toBe(false);
    expect(sendPlanUpgradeEmailMock).toHaveBeenCalledTimes(1);
  });

  it("a replayed charge.completed does not credit the referral commission twice", async () => {
    const earningsInserts: unknown[] = [];
    const makeTables = (profilePlan: string, firstPaidAt: string | null) => {
      fromMock.mockImplementation((table: string) => {
        if (table === "profiles") {
          return profilesChain({ existing: { plan: profilePlan, referred_via: "link-1" } }, []);
        }
        if (table === "referral_conversions") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: "conv-1", first_paid_at: firstPaidAt }, error: null }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          };
        }
        if (table === "referral_links") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "link-1",
                active: true,
                commission_type: "percentage",
                commission_rate: 0.2,
                flat_amount_usd: null,
              },
              error: null,
            }),
          };
        }
        if (table === "referral_earnings") {
          return {
            insert: vi.fn((row: unknown) => {
              earningsInserts.push(row);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return defaultChain();
      });
    };

    const { POST } = await route();

    makeTables("free", null);
    const first = await (await POST(signed(payload) as never)).json();
    expect(first.referralCredited).toEqual({ commission: 49 * 0.2, linkId: "link-1" });
    expect(earningsInserts).toHaveLength(1);
    expect(earningsInserts[0]).toMatchObject({
      referral_link_id: "link-1",
      conversion_id: "conv-1",
      user_id: USER_ID,
      payment_source: "flutterwave",
      payment_reference: TX_REF_PRO,
      payment_amount_usd: 49,
      commission_usd: 49 * 0.2,
    });

    makeTables("pro", new Date().toISOString());
    const second = await (await POST(signed(payload) as never)).json();
    expect(second.referralCredited).toBeUndefined();
    expect(earningsInserts).toHaveLength(1);
  });

  // The handler has no event-id ledger: a replayed charge.completed re-runs the
  // profile update, which includes `generation_count: 0`. A retry mid-month
  // would therefore hand the user a fresh generation quota. Reported under
  // left_undone; the fix belongs in the route (skip the reset when the plan
  // and subscription id are unchanged, or record data.id in a processed-events
  // table).
  it.todo(
    "a replayed charge.completed should not reset generation_count a second time (src/app/api/webhooks/flutterwave/route.ts:171-183)"
  );
});

describe("POST /api/webhooks/flutterwave — other events", () => {
  it("subscription.cancelled downgrades by payment_customer_id", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    const res = await POST(
      signed({ event: "subscription.cancelled", data: { customer: { id: 555 } } }) as never
    );
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0].filter).toEqual(["payment_customer_id", "555"]);
    expect(updates[0].row).toMatchObject({
      plan: "free",
      payment_subscription_id: null,
      payment_plan_code: null,
    });
  });

  it("subscription.disabled without a customer id is a no-op", async () => {
    const updates = setupProfiles();
    const { POST } = await route();
    await POST(signed({ event: "subscription.disabled", data: {} }) as never);
    expect(updates).toHaveLength(0);
  });

  it("charge.failed notifies the matching user", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: USER_ID }, error: null }),
        };
      }
      return defaultChain();
    });
    const { POST } = await route();
    await POST(signed({ event: "charge.failed", data: { customer: { id: 555 } } }) as never);
    expect(createNotificationMock).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ type: "payment_failed", actionUrl: "/settings/billing" })
    );
  });
});
