import { describe, it, expect, vi, beforeEach } from "vitest";

const updateContactStatusMock = vi.fn().mockResolvedValue({ ok: true, data: true });
vi.mock("@/src/lib/email/marketing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/marketing")>();
  return { ...actual, updateContactStatus: (...a: unknown[]) => updateContactStatusMock(...a) };
});

const fromMock = vi.fn();
const authGetUserMock = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: fromMock, auth: { getUser: authGetUserMock } }),
}));

const USER = { id: "user-1" };
const PARAMS = { params: Promise.resolve({ id: "p1", audienceId: "aud1" }) };

type Chain = Record<string, any>;

function ownedProject(): Chain {
  const c: Chain = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: { id: "p1" }, error: null });
  return c;
}
function audience(): Chain {
  const c: Chain = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: { id: "aud1", resend_audience_id: "raud" }, error: null });
  return c;
}
// Contacts chain: `.select().eq().in()` resolves the existing rows, update /
// insert calls are captured and resolve ok.
function contacts(existing: unknown[]): Chain & { updateCalls: unknown[]; insertCalls: unknown[] } {
  const c: Chain = { updateCalls: [], insertCalls: [] };
  let mode: "read" | "update" | "insert" = "read";
  c.select = vi.fn().mockImplementation(() => c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockImplementation(() => {
    if (mode === "read") return Promise.resolve({ data: existing, error: null });
    return c;
  });
  c.update = vi.fn().mockImplementation((v: unknown) => {
    mode = "update";
    c.updateCalls.push(v);
    return c;
  });
  c.insert = vi.fn().mockImplementation((rows: unknown) => {
    mode = "insert";
    c.insertCalls.push(rows);
    return {
      select: () => Promise.resolve({ data: (rows as unknown[]).map((_, i) => ({ id: `new-${i}` })), error: null }),
    };
  });
  c.then = (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res);
  return c as Chain & { updateCalls: unknown[]; insertCalls: unknown[] };
}
function enrollments(): Chain {
  const c: Chain = {};
  c.update = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.then = (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res);
  return c;
}

function post(body: unknown) {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  authGetUserMock.mockResolvedValue({ data: { user: USER }, error: null });
});

describe("POST .../contacts/suppress", () => {
  it("401 without a session", async () => {
    authGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import("@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/suppress/route");
    expect((await POST(post({ list: "a@x.com" }), PARAMS)).status).toBe(401);
  });

  it("400 when nothing in the paste is an email", async () => {
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : audience()));
    const { POST } = await import("@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/suppress/route");
    const res = await POST(post({ list: "not an email\nnope" }), PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json()).invalid).toEqual(["not", "an", "email", "nope"]);
  });

  it("suppresses existing contacts, leaves bounced ones, inserts missing ones as suppressed", async () => {
    const contactsChain = contacts([
      { id: "c1", email: "a@x.com", status: "subscribed", resend_contact_id: "rc1" },
      { id: "c2", email: "b@x.com", status: "bounced", resend_contact_id: null },
      { id: "c3", email: "c@x.com", status: "pending", resend_contact_id: null },
    ]);
    const enr = enrollments();
    fromMock.mockImplementation((t: string) => {
      if (t === "projects") return ownedProject();
      if (t === "audiences") return audience();
      if (t === "audience_contacts") return contactsChain;
      if (t === "email_sequence_enrollments") return enr;
      throw new Error(`unexpected table ${t}`);
    });

    const { POST } = await import("@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/suppress/route");
    const res = await POST(post({ list: "A@x.com, b@x.com\nc@x.com\nnew@x.com\nbad-entry" }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ suppressed: 2, inserted: 1, unchanged: 1, total: 4, invalid: ["bad-entry"] });

    // Existing subscribed + pending flipped, bounced untouched.
    expect(contactsChain.updateCalls[0]).toMatchObject({ status: "suppressed", suppression_reason: "manual" });
    expect(contactsChain.in).toHaveBeenCalledWith("id", ["c1", "c3"]);

    // Missing address inserted as suppressed.
    expect(contactsChain.insertCalls[0]).toEqual([
      expect.objectContaining({ audience_id: "aud1", email: "new@x.com", status: "suppressed", suppression_reason: "manual" }),
    ]);

    // In-flight series cancelled; Resend mirror told to stop.
    expect(enr.update).toHaveBeenCalledWith({ status: "cancelled", cancellation_reason: "suppressed" });
    expect(updateContactStatusMock).toHaveBeenCalledWith("raud", "rc1", true);
  });
});
