import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

// Mock Resend wrapper.
const createBroadcastMock = vi.fn();
const sendBroadcastMock = vi.fn();

vi.mock("@/src/lib/email/marketing", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/email/marketing")>(
    "@/src/lib/email/marketing"
  );
  return {
    ...actual,
    createBroadcast: (...args: unknown[]) => createBroadcastMock(...args),
    sendBroadcast: (...args: unknown[]) => sendBroadcastMock(...args),
  };
});

// User-context Supabase + service-role Supabase share a single fromMock for
// these tests — the route uses both, but each query routes by table.
const fromMock = vi.fn();
const rpcMock = vi.fn();
const authGetUserMock = vi.fn();
const supabase = { from: fromMock, rpc: rpcMock, auth: { getUser: authGetUserMock } };

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}));
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => supabase,
}));

const TEST_USER = { id: "user-1", email: "test@example.com", created_at: "x" };
const TEST_PROJECT = { id: "p1", user_id: "user-1" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChainFactory = () => Record<string, any>;
interface TableHandlers {
  projects?: ChainFactory;
  audiences?: ChainFactory;
  audience_contacts?: ChainFactory;
  broadcasts?: ChainFactory;
  profiles?: ChainFactory;
}

function setupTables(h: TableHandlers) {
  fromMock.mockImplementation((table: string) => {
    const make = h[table as keyof TableHandlers];
    if (make) return make();
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

function ownedProjectChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: TEST_PROJECT, error: null }),
  };
}

function profileChain(plan: string, options?: { resetAt?: string | null; usage?: number }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        plan,
        email_usage_count: options?.usage ?? 0,
        email_usage_reset_at: options?.resetAt ?? null,
      },
      error: null,
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authGetUserMock.mockResolvedValue({ data: { user: TEST_USER }, error: null });
  rpcMock.mockResolvedValue({ data: null, error: null });
  createBroadcastMock.mockResolvedValue({ ok: true, data: { id: "rb-1" } });
  sendBroadcastMock.mockResolvedValue({ ok: true, data: true });
});

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/broadcasts — create draft
// ---------------------------------------------------------------------------
describe("POST /api/projects/[id]/broadcasts", () => {
  it("returns 401 without auth", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import("@/src/app/api/projects/[id]/broadcasts/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when subject or html_body missing", async () => {
    setupTables({ projects: ownedProjectChain });
    const { POST } = await import("@/src/app/api/projects/[id]/broadcasts/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience_id: "aud-1", subject: "", html_body: "<p>hi</p>" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("rejects custom from_email until verified-domain flow ships", async () => {
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", name: "List", resend_audience_id: "ra-1", project_id: "p1" },
          error: null,
        }),
      }),
    });
    const { POST } = await import("@/src/app/api/projects/[id]/broadcasts/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience_id: "aud-1",
        subject: "Hello",
        html_body: "<p>Hi</p>",
        from_email: "founder@acme.com",
      }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("CUSTOM_DOMAIN_NOT_AVAILABLE");
  });

  it("creates a draft with shared sender on happy path", async () => {
    let inserted: Record<string, unknown> | null = null;
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", name: "List", resend_audience_id: "ra-1", project_id: "p1" },
          error: null,
        }),
      }),
      broadcasts: () => ({
        insert: vi.fn((row) => {
          inserted = row;
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "b-1", ...row, created_at: new Date().toISOString() },
              error: null,
            }),
          };
        }),
      }),
    });
    const { POST } = await import("@/src/app/api/projects/[id]/broadcasts/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience_id: "aud-1",
        subject: "Hello",
        html_body: "<p>Hi</p>",
      }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(201);
    expect(inserted).toBeTruthy();
    expect(inserted!.from_email).toBe("mail@contacts.conduikt.com");
    expect(inserted!.status).toBe("draft");
    expect(inserted!.from_name).toBe("List"); // defaulted from audience name
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/broadcasts/[broadcastId]/send
// ---------------------------------------------------------------------------
describe("POST .../broadcasts/[broadcastId]/send", () => {
  it("rejects send on a non-draft broadcast", async () => {
    setupTables({
      projects: ownedProjectChain,
      broadcasts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "b-1",
            audience_id: "aud-1",
            subject: "Hi",
            html_body: "<p>x</p>",
            text_body: null,
            from_name: "List",
            from_email: "mail@contacts.conduikt.com",
            reply_to: null,
            status: "sent",
            scheduled_for: null,
            audiences: { id: "aud-1", resend_audience_id: "ra-1", project_id: "p1" },
          },
          error: null,
        }),
      }),
    });
    const { POST } = await import(
      "@/src/app/api/projects/[id]/broadcasts/[broadcastId]/send/route"
    );
    const req = new Request("http://localhost/foo", { method: "POST" });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", broadcastId: "b-1" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("NOT_DRAFT");
  });

  it("rejects send when audience has no subscribed contacts", async () => {
    setupTables({
      projects: ownedProjectChain,
      broadcasts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "b-1",
            audience_id: "aud-1",
            subject: "Hi",
            html_body: "<p>x</p>",
            text_body: null,
            from_name: "List",
            from_email: "mail@contacts.conduikt.com",
            reply_to: null,
            status: "draft",
            scheduled_for: null,
            audiences: { id: "aud-1", resend_audience_id: "ra-1", project_id: "p1" },
          },
          error: null,
        }),
      }),
      audience_contacts: () => {
        // Two-eq count chain: .eq("audience_id", X).eq("status", "subscribed")
        // First eq() returns chain; second eq() resolves with count.
        let eqCalls = 0;
        const c: Record<string, ReturnType<typeof vi.fn>> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(() => {
            eqCalls++;
            if (eqCalls >= 2) {
              return Promise.resolve({ count: 0, error: null });
            }
            return c;
          }),
        };
        return c;
      },
    });
    const { POST } = await import(
      "@/src/app/api/projects/[id]/broadcasts/[broadcastId]/send/route"
    );
    const req = new Request("http://localhost/foo", { method: "POST" });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", broadcastId: "b-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 403 when monthly email quota would be exceeded", async () => {
    setupTables({
      projects: ownedProjectChain,
      broadcasts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "b-1",
            audience_id: "aud-1",
            subject: "Hi",
            html_body: "<p>x</p>",
            text_body: null,
            from_name: "List",
            from_email: "mail@contacts.conduikt.com",
            reply_to: null,
            status: "draft",
            scheduled_for: null,
            audiences: { id: "aud-1", resend_audience_id: "ra-1", project_id: "p1" },
          },
          error: null,
        }),
      }),
      audience_contacts: () => {
        let eqCalls = 0;
        const c: Record<string, ReturnType<typeof vi.fn>> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(() => {
            eqCalls++;
            if (eqCalls >= 2) {
              return Promise.resolve({ count: 80, error: null });
            }
            return c;
          }),
        };
        return c;
      },
      // Free tier 50/mo limit; user already used 0 in current month;
      // sending 80 to 50-cap user should 403.
      profiles: () => profileChain("free", { resetAt: new Date().toISOString(), usage: 0 }),
    });
    const { POST } = await import(
      "@/src/app/api/projects/[id]/broadcasts/[broadcastId]/send/route"
    );
    const req = new Request("http://localhost/foo", { method: "POST" });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", broadcastId: "b-1" }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_GATED");
    expect(createBroadcastMock).not.toHaveBeenCalled();
  });

  it("happy path: locks → creates Resend broadcast → sends → marks sent", async () => {
    let lockUpdate: Record<string, unknown> | null = null;
    let finalUpdate: Record<string, unknown> | null = null;
    let updateCount = 0;
    setupTables({
      projects: ownedProjectChain,
      broadcasts: () => {
        const c: Record<string, unknown> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "b-1",
              audience_id: "aud-1",
              subject: "Hi",
              html_body: "<p>x</p>",
              text_body: null,
              from_name: "List",
              from_email: "mail@contacts.conduikt.com",
              reply_to: null,
              status: "draft",
              scheduled_for: null,
              audiences: { id: "aud-1", resend_audience_id: "ra-1", project_id: "p1" },
            },
            error: null,
          }),
          update: vi.fn((row) => {
            updateCount++;
            if (updateCount === 1) {
              lockUpdate = row;
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: "b-1" }, error: null }),
              };
            }
            finalUpdate = row;
            return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        };
        return c;
      },
      audience_contacts: () => {
        let eqCalls = 0;
        const c: Record<string, ReturnType<typeof vi.fn>> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(() => {
            eqCalls++;
            if (eqCalls >= 2) {
              return Promise.resolve({ count: 25, error: null });
            }
            return c;
          }),
        };
        return c;
      },
      profiles: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan: "pro",
            email_usage_count: 0,
            email_usage_reset_at: new Date().toISOString(),
          },
          error: null,
        }),
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      }),
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/broadcasts/[broadcastId]/send/route"
    );
    const req = new Request("http://localhost/foo", { method: "POST" });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", broadcastId: "b-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.audience_size).toBe(25);

    expect(lockUpdate).toEqual({ status: "sending" });
    expect(createBroadcastMock).toHaveBeenCalled();
    expect(sendBroadcastMock).toHaveBeenCalledWith("rb-1", undefined);
    expect(finalUpdate).toMatchObject({
      status: "sent",
      resend_broadcast_id: "rb-1",
      totals: { sent: 25 },
    });
    // RPC call to bump usage count
    expect(rpcMock).toHaveBeenCalledWith(
      "increment_email_usage",
      expect.objectContaining({ user_id_param: "user-1", by_count: 25 })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/resend
// ---------------------------------------------------------------------------
describe("POST /api/webhooks/resend", () => {
  const SECRET = "whsec_" + Buffer.from("test-secret-bytes").toString("base64");
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_SECRET = process.env.RESEND_WEBHOOK_SECRET;

  function signRequest(svixId: string, body: string) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const keyB64 = SECRET.slice(6);
    const keyBuf = Buffer.from(keyB64, "base64");
    const sig = crypto
      .createHmac("sha256", keyBuf)
      .update(`${svixId}.${ts}.${body}`)
      .digest("base64");
    return {
      "svix-id": svixId,
      "svix-timestamp": ts,
      "svix-signature": `v1,${sig}`,
      "content-type": "application/json",
    };
  }

  beforeEach(() => {
    // @ts-expect-error - readonly at types but mutable at runtime
    process.env.NODE_ENV = "production";
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_NODE_ENV === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      // @ts-expect-error - same
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
    if (ORIGINAL_SECRET === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it("rejects unsigned requests in production", async () => {
    const { POST } = await import("@/src/app/api/webhooks/resend/route");
    const res = await POST(
      new Request("http://localhost/wh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "email.delivered" }),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("rejects forged signature", async () => {
    const body = JSON.stringify({ type: "email.delivered" });
    const headers = signRequest("evt_123", body);
    headers["svix-signature"] = "v1,WRONG";
    const { POST } = await import("@/src/app/api/webhooks/resend/route");
    const res = await POST(
      new Request("http://localhost/wh", { method: "POST", headers, body }) as never
    );
    expect(res.status).toBe(401);
  });

  it("ignores events with no broadcast_id", async () => {
    const body = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { to: "x@y.com" }, // no broadcast_id
    });
    const headers = signRequest("evt_321", body);
    const { POST } = await import("@/src/app/api/webhooks/resend/route");
    const res = await POST(
      new Request("http://localhost/wh", { method: "POST", headers, body }) as never
    );
    expect(res.status).toBe(200);
  });

  it("records a delivered event + bumps broadcasts.totals", async () => {
    let insertedEvent: Record<string, unknown> | null = null;
    let totalsUpdate: Record<string, unknown> | null = null;
    setupTables({
      broadcasts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "b-1", audience_id: "aud-1", totals: {} },
          error: null,
        }),
        update: vi.fn((row) => {
          totalsUpdate = row;
          return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }),
      }),
      audience_contacts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c-1" }, error: null }),
      }),
    });
    // email_events insert
    fromMock.mockImplementation((table: string) => {
      if (table === "email_events") {
        return {
          insert: vi.fn((row) => {
            insertedEvent = row;
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      if (table === "broadcasts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "b-1", audience_id: "aud-1", totals: {} },
            error: null,
          }),
          update: vi.fn((row) => {
            totalsUpdate = row;
            return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        };
      }
      if (table === "audience_contacts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c-1" }, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const body = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { broadcast_id: "rb-1", to: "alice@example.com" },
    });
    const headers = signRequest("evt_456", body);
    const { POST } = await import("@/src/app/api/webhooks/resend/route");
    const res = await POST(
      new Request("http://localhost/wh", { method: "POST", headers, body }) as never
    );
    expect(res.status).toBe(200);
    expect(insertedEvent).toMatchObject({
      broadcast_id: "b-1",
      contact_id: "c-1",
      event_type: "delivered",
      resend_event_id: "evt_456",
    });
    expect(totalsUpdate).toEqual({ totals: { delivered: 1 } });
  });

  it("suppresses contact on email.complained", async () => {
    let contactUpdate: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === "broadcasts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "b-1", audience_id: "aud-1", totals: {} },
            error: null,
          }),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
        };
      }
      if (table === "audience_contacts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c-1" }, error: null }),
          update: vi.fn((row) => {
            contactUpdate = row;
            return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        };
      }
      if (table === "email_events") {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const body = JSON.stringify({
      type: "email.complained",
      created_at: new Date().toISOString(),
      data: { broadcast_id: "rb-1", to: "spammed@example.com" },
    });
    const headers = signRequest("evt_789", body);
    const { POST } = await import("@/src/app/api/webhooks/resend/route");
    const res = await POST(
      new Request("http://localhost/wh", { method: "POST", headers, body }) as never
    );
    expect(res.status).toBe(200);
    expect(contactUpdate).toMatchObject({
      status: "complained",
      suppression_reason: "complained",
    });
  });
});
