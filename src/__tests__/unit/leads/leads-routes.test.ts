import { describe, it, expect, vi, beforeEach } from "vitest";

// Routed Supabase mock, same shape as src/__tests__/integration/email-audiences.test.ts.
const fromMock = vi.fn();
const authGetUserMock = vi.fn();
const supabase = { from: fromMock, auth: { getUser: authGetUserMock } };

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}));

const TEST_USER = { id: "user-1", email: "test@example.com" };
const PROJECT = { id: "p1", user_id: "user-1", name: "Lekki Dental", booking_url: "https://calendly.com/lekki" };

type ChainFactory = () => Record<string, any>;

// A thenable chain: every builder method returns the chain, awaiting it
// (or .single()/.maybeSingle()) resolves to `result`.
function chain(result: unknown, extra: Record<string, any> = {}) {
  const c: Record<string, any> = {};
  for (const m of ["select", "update", "eq", "in", "order", "range", "limit"]) c[m] = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  Object.assign(c, extra);
  return c;
}

function setupTables(handlers: Record<string, ChainFactory>) {
  fromMock.mockImplementation((table: string) => (handlers[table] ?? (() => chain({ data: null, error: null })))());
}

beforeEach(() => {
  vi.clearAllMocks();
  authGetUserMock.mockResolvedValue({ data: { user: TEST_USER }, error: null });
});

const params = (contactId = "c1") => ({ params: Promise.resolve({ id: "p1", contactId }) });
const patchReq = (body: unknown) =>
  new Request("http://localhost/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("PATCH /api/projects/[id]/leads/[contactId]", () => {
  it("returns 401 without a session", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { PATCH } = await import("@/src/app/api/projects/[id]/leads/[contactId]/route");
    const res = await PATCH(patchReq({ stage: "won" }) as never, params());
    expect(res.status).toBe(401);
  });

  it("rejects a stage outside the enum with 400", async () => {
    setupTables({ projects: () => chain({ data: PROJECT, error: null }) });
    const { PATCH } = await import("@/src/app/api/projects/[id]/leads/[contactId]/route");
    const res = await PATCH(patchReq({ stage: "closed" }) as never, params());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.field).toBe("stage");
    expect(body.error).toContain("Won");
  });

  it("404s when the contact's list belongs to another project", async () => {
    setupTables({
      projects: () => chain({ data: PROJECT, error: null }),
      audience_contacts: () =>
        chain({ data: { id: "c1", audience_id: "a9", pipeline_stage: "new", stage_changed_at: null }, error: null }),
      audiences: () => chain({ data: null, error: null }),
    });
    const { PATCH } = await import("@/src/app/api/projects/[id]/leads/[contactId]/route");
    const res = await PATCH(patchReq({ stage: "won" }) as never, params());
    expect(res.status).toBe(404);
  });

  it("moves the stage and stamps stage_changed_at", async () => {
    const updateSpy = vi.fn();
    setupTables({
      projects: () => chain({ data: PROJECT, error: null }),
      audience_contacts: () => {
        const c = chain({ data: { id: "c1", audience_id: "a1", pipeline_stage: "new", stage_changed_at: null }, error: null });
        c.update = vi.fn((payload: unknown) => {
          updateSpy(payload);
          return chain({ data: { id: "c1", pipeline_stage: "qualified", stage_changed_at: "2026-11-17T00:00:00.000Z" }, error: null });
        });
        return c;
      },
      audiences: () => chain({ data: { id: "a1" }, error: null }),
    });
    const { PATCH } = await import("@/src/app/api/projects/[id]/leads/[contactId]/route");
    const res = await PATCH(patchReq({ stage: "qualified" }) as never, params());
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ pipeline_stage: "qualified", stage_changed_at: expect.any(String) })
    );
    const body = await res.json();
    expect(body.stage).toBe("qualified");
  });
});

describe("GET /api/projects/[id]/leads", () => {
  it("returns an empty list (and the booking link) when the project has no subscriber lists", async () => {
    setupTables({
      projects: () => chain({ data: PROJECT, error: null }),
      audiences: () => chain({ data: [], error: null }),
    });
    const { GET } = await import("@/src/app/api/projects/[id]/leads/route");
    const res = await GET(new Request("http://localhost/x") as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads).toEqual([]);
    expect(body.booking_url).toBe(PROJECT.booking_url);
  });

  it("scores and shapes every contact, capping the page at 200", async () => {
    const rangeSpy = vi.fn();
    const now = new Date().toISOString();
    setupTables({
      projects: () => chain({ data: PROJECT, error: null }),
      audiences: () => chain({ data: [{ id: "a1", name: "Newsletter" }], error: null }),
      audience_contacts: () => {
        const rows = [
          {
            id: "c1",
            audience_id: "a1",
            email: "ada@example.com",
            first_name: "Ada",
            last_name: null,
            phone: "2348031234567",
            whatsapp_opt_in: true,
            whatsapp_opt_in_at: null,
            status: "subscribed",
            pipeline_stage: null,
            stage_changed_at: null,
            lead_source: "form",
            last_reply_at: now,
            subscribed_at: now,
            created_at: now,
          },
        ];
        const c = chain({ data: rows, count: 1, error: null });
        c.range = vi.fn((from: number, to: number) => {
          rangeSpy(from, to);
          return c;
        });
        return c;
      },
      email_events: () => chain({ data: [], error: null }),
    });
    const { GET } = await import("@/src/app/api/projects/[id]/leads/route");
    const res = await GET(new Request("http://localhost/x?limit=999&page=2") as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(rangeSpy).toHaveBeenCalledWith(200, 399);
    const body = await res.json();
    expect(body.limit).toBe(200);
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0]).toMatchObject({ stage: "new", source: "form", score: 100, audience_name: "Newsletter" });
  });
});
