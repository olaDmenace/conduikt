import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Admin role gate.
//
// requireAdmin (src/lib/admin/auth.ts) is exercised for real against a mocked
// user-context Supabase client; every admin route is then hit as a non-admin
// and must answer 403 before touching the service-role client.
// ---------------------------------------------------------------------------

const authGetUserMock = vi.fn();
const profileSingleMock = vi.fn();
const userClient = {
  auth: { getUser: authGetUserMock },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: profileSingleMock,
  })),
};
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(userClient),
}));

// The service-role client must never be used by a request that fails the gate.
const serviceFromMock = vi.fn();
const serviceAdminMock = { updateUserById: vi.fn(), listUsers: vi.fn(), getUserById: vi.fn() };
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: serviceFromMock, auth: { admin: serviceAdminMock } }),
}));

const USER = { id: "user-1", email: "someone@example.com" };

function signedInAs(role: string | null) {
  authGetUserMock.mockResolvedValue({ data: { user: USER }, error: null });
  profileSingleMock.mockResolvedValue({
    data: role === null ? null : { role },
    error: null,
  });
}

function json(method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/x", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs("user");
});

describe("requireAdmin", () => {
  it("returns 401 when there is no session", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { requireAdmin } = await import("@/src/lib/admin/auth");
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it("returns 403 for a signed-in user whose role is not admin", async () => {
    signedInAs("user");
    const { requireAdmin } = await import("@/src/lib/admin/auth");
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(await result.response.json()).toEqual({ error: "Forbidden" });
    }
  });

  it("returns 403 when the profile row is missing", async () => {
    signedInAs(null);
    const { requireAdmin } = await import("@/src/lib/admin/auth");
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("does not accept a role that merely contains 'admin'", async () => {
    signedInAs("superadmin");
    const { requireAdmin } = await import("@/src/lib/admin/auth");
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
  });

  it("passes for role = admin and returns the caller id", async () => {
    signedInAs("admin");
    const { requireAdmin } = await import("@/src/lib/admin/auth");
    const result = await requireAdmin();
    expect(result).toEqual({ ok: true, userId: USER.id });
  });
});

describe("admin routes answer 403 to a non-admin", () => {
  const cases: Array<{ name: string; run: () => Promise<Response> }> = [
    {
      name: "GET /api/admin/config",
      run: async () => (await import("@/src/app/api/admin/config/route")).GET(),
    },
    {
      name: "PUT /api/admin/config",
      run: async () =>
        (await import("@/src/app/api/admin/config/route")).PUT(
          json("PUT", { emails: ["a@b.c"] }) as never
        ),
    },
    {
      name: "POST /api/admin/role",
      run: async () =>
        (await import("@/src/app/api/admin/role/route")).POST(
          json("POST", { email: "x@y.z", action: "promote" }) as never
        ),
    },
    {
      name: "PATCH /api/admin/users/[id]",
      run: async () =>
        (await import("@/src/app/api/admin/users/[id]/route")).PATCH(
          json("PATCH", { action: "change_plan", plan: "agency" }) as never,
          { params: Promise.resolve({ id: "victim" }) }
        ),
    },
    {
      name: "GET /api/admin/users/export",
      run: async () => (await import("@/src/app/api/admin/users/export/route")).GET(),
    },
    {
      name: "POST /api/admin/referrals",
      run: async () =>
        (await import("@/src/app/api/admin/referrals/route")).POST(
          json("POST", {
            code: "x",
            label: "x",
            partner_name: "x",
            partner_email: "x@y.z",
          }) as never
        ),
    },
    {
      name: "PATCH /api/admin/referrals/[id]",
      run: async () =>
        (await import("@/src/app/api/admin/referrals/[id]/route")).PATCH(
          json("PATCH", { active: false }) as never,
          { params: Promise.resolve({ id: "link-1" }) }
        ),
    },
    {
      name: "DELETE /api/admin/referrals/[id]",
      run: async () =>
        (await import("@/src/app/api/admin/referrals/[id]/route")).DELETE(
          json("DELETE") as never,
          { params: Promise.resolve({ id: "link-1" }) }
        ),
    },
    {
      name: "POST /api/admin/referrals/earnings",
      run: async () =>
        (await import("@/src/app/api/admin/referrals/earnings/route")).POST(
          json("POST", { referral_link_id: "link-1", payment_amount_usd: 49 }) as never
        ),
    },
    {
      name: "POST /api/admin/referrals/payouts",
      run: async () =>
        (await import("@/src/app/api/admin/referrals/payouts/route")).POST(
          json("POST", {
            partner_name: "x",
            partner_email: "x@y.z",
            amount_usd: 10,
          }) as never
        ),
    },
  ];

  for (const c of cases) {
    it(`${c.name} returns 403 and never opens the service client`, async () => {
      signedInAs("user");
      const res = await c.run();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      expect(serviceFromMock).not.toHaveBeenCalled();
      expect(serviceAdminMock.updateUserById).not.toHaveBeenCalled();
      expect(serviceAdminMock.listUsers).not.toHaveBeenCalled();
    });
  }

  it("PATCH /api/admin/users/[id] returns 401 when signed out", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { PATCH } = await import("@/src/app/api/admin/users/[id]/route");
    const res = await PATCH(json("PATCH", { action: "disable" }) as never, {
      params: Promise.resolve({ id: "victim" }),
    });
    expect(res.status).toBe(401);
    expect(serviceAdminMock.updateUserById).not.toHaveBeenCalled();
  });

  it("an admin gets through the gate on PATCH /api/admin/users/[id]", async () => {
    signedInAs("admin");
    serviceFromMock.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });
    const { PATCH } = await import("@/src/app/api/admin/users/[id]/route");
    const res = await PATCH(json("PATCH", { action: "reset_count" }) as never, {
      params: Promise.resolve({ id: "someone" }),
    });
    expect(res.status).toBe(200);
    expect(serviceFromMock).toHaveBeenCalledWith("profiles");
  });
});
