import { describe, it, expect, vi, beforeEach } from "vitest";

// PATCH /api/projects/[id]/audiences/[audienceId]/contacts/[contactId]
//
// The status flips that matter for Resend: a contact that was never
// mirrored (pending sign-up, pasted suppression row) must be created in
// the Resend audience when the owner marks them subscribed, and a pending
// contact marked subscribed counts as confirmed by the owner.

const updateContactStatusMock = vi.fn().mockResolvedValue({ ok: true, data: true });
const createContactMock = vi.fn();
vi.mock("@/src/lib/email/marketing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/marketing")>();
  return {
    ...actual,
    updateContactStatus: (...a: unknown[]) => updateContactStatusMock(...a),
    createContact: (...a: unknown[]) => createContactMock(...a),
  };
});

const fromMock = vi.fn();
const authGetUserMock = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: fromMock, auth: { getUser: authGetUserMock } }),
}));

const USER = { id: "user-1" };
const PARAMS = { params: Promise.resolve({ id: "p1", audienceId: "aud1", contactId: "c1" }) };

type Chain = Record<string, any>;

function ownedProject(): Chain {
  const c: Chain = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: { id: "p1" }, error: null });
  return c;
}

// First select().eq().eq().single() returns the contact row (joined with
// its audience); the update().eq().eq().select().single() echoes what was
// written so the response can be checked.
function contacts(row: Record<string, unknown>, audience: Record<string, unknown>) {
  const c: Chain = { updateCalls: [] as unknown[] };
  let mode: "read" | "update" = "read";
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockImplementation((v: unknown) => {
    mode = "update";
    c.updateCalls.push(v);
    return c;
  });
  c.single = vi.fn().mockImplementation(() => {
    if (mode === "read") return Promise.resolve({ data: { ...row, audiences: audience }, error: null });
    return Promise.resolve({ data: { id: row.id, ...(c.updateCalls[0] as object) }, error: null });
  });
  return c as Chain & { updateCalls: unknown[] };
}

function patch(body: unknown) {
  return new Request("http://localhost/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const AUDIENCE = { id: "aud1", project_id: "p1", resend_audience_id: "raud" };

beforeEach(() => {
  vi.clearAllMocks();
  authGetUserMock.mockResolvedValue({ data: { user: USER }, error: null });
  createContactMock.mockResolvedValue({ ok: true, data: { id: "rc-new", email: "x", unsubscribed: false } });
});

async function route() {
  return import("@/src/app/api/projects/[id]/audiences/[audienceId]/contacts/[contactId]/route");
}

describe("PATCH .../contacts/[contactId] status flips", () => {
  it("marking a pending (never mirrored) contact subscribed creates the Resend contact and sets confirmed_at", async () => {
    const chain = contacts(
      { id: "c1", audience_id: "aud1", email: "alice@x.com", first_name: "Alice", last_name: null, resend_contact_id: null, status: "pending" },
      AUDIENCE
    );
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : chain));

    const { PATCH } = await route();
    const res = await PATCH(patch({ status: "subscribed" }), PARAMS);
    expect(res.status).toBe(200);

    expect(createContactMock).toHaveBeenCalledWith("raud", { email: "alice@x.com", first_name: "Alice", last_name: undefined });
    expect(updateContactStatusMock).not.toHaveBeenCalled();

    const written = chain.updateCalls[0] as Record<string, unknown>;
    expect(written).toMatchObject({
      status: "subscribed",
      resend_contact_id: "rc-new",
      pending_sequence_id: null,
      unsubscribed_at: null,
      suppression_reason: null,
    });
    expect(typeof written.confirmed_at).toBe("string");
    expect(typeof written.subscribed_at).toBe("string");
  });

  it("unsuppressing a pasted-list row (no Resend id) adds them to the Resend audience without touching confirmed_at", async () => {
    const chain = contacts(
      { id: "c1", audience_id: "aud1", email: "bob@x.com", first_name: null, last_name: null, resend_contact_id: null, status: "suppressed" },
      AUDIENCE
    );
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : chain));

    const { PATCH } = await route();
    const res = await PATCH(patch({ status: "subscribed" }), PARAMS);
    expect(res.status).toBe(200);
    expect(createContactMock).toHaveBeenCalledTimes(1);
    const written = chain.updateCalls[0] as Record<string, unknown>;
    expect(written.resend_contact_id).toBe("rc-new");
    expect(written).not.toHaveProperty("confirmed_at");
  });

  it("still updates (not creates) when the contact is already mirrored", async () => {
    const chain = contacts(
      { id: "c1", audience_id: "aud1", email: "carol@x.com", first_name: null, last_name: null, resend_contact_id: "rc-1", status: "unsubscribed" },
      AUDIENCE
    );
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : chain));

    const { PATCH } = await route();
    const res = await PATCH(patch({ status: "subscribed" }), PARAMS);
    expect(res.status).toBe(200);
    expect(updateContactStatusMock).toHaveBeenCalledWith("raud", "rc-1", false);
    expect(createContactMock).not.toHaveBeenCalled();
    expect(chain.updateCalls[0]).not.toHaveProperty("resend_contact_id");
  });

  it("does not create a Resend contact when suppressing, and keeps going when Resend fails", async () => {
    const chain = contacts(
      { id: "c1", audience_id: "aud1", email: "dan@x.com", first_name: null, last_name: null, resend_contact_id: null, status: "subscribed" },
      AUDIENCE
    );
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : chain));
    const { PATCH } = await route();
    expect((await PATCH(patch({ status: "suppressed" }), PARAMS)).status).toBe(200);
    expect(createContactMock).not.toHaveBeenCalled();

    // Resend down: the local flip still lands, just without a mirror id.
    createContactMock.mockRejectedValueOnce(new Error("boom"));
    const chain2 = contacts(
      { id: "c1", audience_id: "aud1", email: "dan@x.com", first_name: null, last_name: null, resend_contact_id: null, status: "pending" },
      AUDIENCE
    );
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : chain2));
    const res = await PATCH(patch({ status: "subscribed" }), PARAMS);
    expect(res.status).toBe(200);
    expect(chain2.updateCalls[0]).toMatchObject({ status: "subscribed" });
    expect(chain2.updateCalls[0]).not.toHaveProperty("resend_contact_id");
  });

  it("refuses to re-subscribe a bounced or complained contact", async () => {
    const chain = contacts(
      { id: "c1", audience_id: "aud1", email: "eve@x.com", first_name: null, last_name: null, resend_contact_id: null, status: "bounced" },
      AUDIENCE
    );
    fromMock.mockImplementation((t: string) => (t === "projects" ? ownedProject() : chain));
    const { PATCH } = await route();
    const res = await PATCH(patch({ status: "subscribed" }), PARAMS);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("HARD_SUPPRESSED");
    expect(createContactMock).not.toHaveBeenCalled();
  });
});
