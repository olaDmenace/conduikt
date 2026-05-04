import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Resend wrapper — tests don't talk to Resend.
const createAudienceMock = vi.fn();
const deleteAudienceMock = vi.fn();
const createContactMock = vi.fn();
const updateContactStatusMock = vi.fn();
const removeContactMock = vi.fn();

vi.mock("@/src/lib/email/marketing", () => ({
  createAudience: (...args: unknown[]) => createAudienceMock(...args),
  deleteAudience: (...args: unknown[]) => deleteAudienceMock(...args),
  createContact: (...args: unknown[]) => createContactMock(...args),
  updateContactStatus: (...args: unknown[]) => updateContactStatusMock(...args),
  removeContact: (...args: unknown[]) => removeContactMock(...args),
}));

// Per-test routed Supabase mock. The audiences API touches multiple tables
// (`projects` for ownership, `profiles` for plan, `audiences`/`audience_contacts`
// for the actual data). Each test wires the table behaviors it needs via
// setupTables().
const fromMock = vi.fn();
const authGetUserMock = vi.fn();
const supabase = { from: fromMock, auth: { getUser: authGetUserMock } };

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}));

const TEST_USER = { id: "user-1", email: "test@example.com", created_at: "x" };
const TEST_PROJECT = { id: "p1", user_id: "user-1" };

interface TableHandlers {
  projects?: () => Record<string, ReturnType<typeof vi.fn>>;
  audiences?: () => Record<string, ReturnType<typeof vi.fn>>;
  audience_contacts?: () => Record<string, ReturnType<typeof vi.fn>>;
  profiles?: () => Record<string, ReturnType<typeof vi.fn>>;
}

function setupTables(handlers: TableHandlers) {
  fromMock.mockImplementation((table: string) => {
    const make = handlers[table as keyof TableHandlers];
    if (make) return make();
    // Default chain — silently returns no data for unexpected tables.
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

// Common chain for verifyProjectOwnership: from('projects').select('id').eq().eq().single()
function ownedProjectChain() {
  const c: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: TEST_PROJECT, error: null }),
  };
  return c;
}

// Profile chain: from('profiles').select('plan').eq('id').single()
function profileChain(plan: string) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { plan }, error: null }),
  };
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  authGetUserMock.mockResolvedValue({ data: { user: TEST_USER }, error: null });
  createAudienceMock.mockResolvedValue({
    ok: true,
    data: { id: "resend-aud-1", name: "Test", created_at: new Date().toISOString() },
  });
  createContactMock.mockResolvedValue({
    ok: true,
    data: { id: "resend-c-1", email: "x", unsubscribed: false },
  });
  deleteAudienceMock.mockResolvedValue({ ok: true, data: true });
  updateContactStatusMock.mockResolvedValue({ ok: true, data: true });
  removeContactMock.mockResolvedValue({ ok: true, data: true });
});

describe("POST /api/projects/[id]/audiences", () => {
  it("returns 401 without auth", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import("@/src/app/api/projects/[id]/audiences/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    setupTables({
      projects: ownedProjectChain,
      profiles: () => profileChain("pro"),
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    });

    const { POST } = await import("@/src/app/api/projects/[id]/audiences/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 PLAN_GATED when free user already has 1 audience", async () => {
    setupTables({
      projects: ownedProjectChain,
      profiles: () => profileChain("free"),
      audiences: () => ({
        // count query: select() -> eq() resolves
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }),
    });

    const { POST } = await import("@/src/app/api/projects/[id]/audiences/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Newsletter" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_GATED");
    expect(createAudienceMock).not.toHaveBeenCalled();
  });

  it("creates audience + mirrors in Resend on happy path", async () => {
    let insertCalled = false;
    setupTables({
      projects: ownedProjectChain,
      profiles: () => profileChain("pro"),
      audiences: () => ({
        // Order of calls inside route: select+eq for count, then insert+select+single
        // Build a chain that supports both shapes.
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        insert: vi.fn(() => {
          insertCalled = true;
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "aud-1",
                name: "Newsletter",
                description: null,
                resend_audience_id: "resend-aud-1",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }),
      }),
    });

    const { POST } = await import("@/src/app/api/projects/[id]/audiences/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Newsletter" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(201);
    expect(createAudienceMock).toHaveBeenCalledWith("Newsletter");
    expect(insertCalled).toBe(true);
  });

  it("returns 502 if Resend create fails (no Conduikt insert)", async () => {
    let insertCalled = false;
    createAudienceMock.mockResolvedValueOnce({ ok: false, error: "Resend rate-limit" });
    setupTables({
      projects: ownedProjectChain,
      profiles: () => profileChain("pro"),
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        insert: vi.fn(() => {
          insertCalled = true;
          return { select: vi.fn().mockReturnThis(), single: vi.fn() };
        }),
      }),
    });

    const { POST } = await import("@/src/app/api/projects/[id]/audiences/route");
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Newsletter" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(502);
    expect(insertCalled).toBe(false);
  });
});

describe("POST /api/projects/[id]/audiences/[audienceId]/contacts", () => {
  it("rejects invalid email with 400", async () => {
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", resend_audience_id: "res-1" },
          error: null,
        }),
      }),
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", audienceId: "aud-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 at contact limit", async () => {
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", resend_audience_id: "res-1" },
          error: null,
        }),
      }),
      profiles: () => profileChain("free"),
      audience_contacts: () => ({
        select: vi.fn().mockReturnThis(),
        // free contact cap is 100, currently at 100 → over limit on +1
        eq: vi.fn().mockResolvedValue({ count: 100, error: null }),
      }),
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", audienceId: "aud-1" }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_GATED");
  });

  it("inserts contact + mirrors in Resend on happy path", async () => {
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", resend_audience_id: "res-1" },
          error: null,
        }),
      }),
      profiles: () => profileChain("pro"),
      audience_contacts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "c-1",
            email: "alice@example.com",
            first_name: "Alice",
            last_name: null,
            status: "subscribed",
            custom_fields: {},
            subscribed_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@example.com", first_name: "Alice" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", audienceId: "aud-1" }),
    });
    expect(res.status).toBe(201);
    expect(createContactMock).toHaveBeenCalledWith(
      "res-1",
      expect.objectContaining({ email: "alice@example.com", first_name: "Alice" })
    );
  });
});

describe("POST /api/projects/[id]/audiences/[audienceId]/contacts/import", () => {
  it("rejects empty CSV body", async () => {
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", resend_audience_id: "res-1" },
          error: null,
        }),
      }),
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/import/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: "" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", audienceId: "aud-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("imports valid contacts and reports failed/skipped counts", async () => {
    const csv = [
      "email,first_name",
      "alice@example.com,Alice",
      "bob@example.com,Bob",
      "not-an-email,Bad",
    ].join("\n");

    // Track per-from() call count for the audience_contacts table — each
    // from() call inside the route hits a different stage of the flow.
    let acCallCount = 0;
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", resend_audience_id: "res-1" },
          error: null,
        }),
      }),
      profiles: () => profileChain("pro"),
      audience_contacts: () => {
        acCallCount++;
        if (acCallCount === 1) {
          // Stage 1: count query inside checkContactsLimit
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          };
        }
        if (acCallCount === 2) {
          // Stage 2: dedup-existing query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        // Stage 3: bulk insert(...).select('id')
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: [{ id: "c1" }, { id: "c2" }],
            error: null,
          }),
        };
      },
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/import/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", audienceId: "aud-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(2);
    expect(body.failed).toBe(1); // the bad-email row
    expect(body.skipped).toBe(0);
  });

  it("returns 403 when audience is already at full plan limit", async () => {
    setupTables({
      projects: ownedProjectChain,
      audiences: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "aud-1", resend_audience_id: "res-1" },
          error: null,
        }),
      }),
      profiles: () => profileChain("free"),
      audience_contacts: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 100, error: null }), // at cap
      }),
    });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/import/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: "email\nnew@example.com" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", audienceId: "aud-1" }),
    });
    expect(res.status).toBe(403);
  });
});
