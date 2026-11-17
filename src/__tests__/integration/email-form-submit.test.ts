import { describe, it, expect, vi, beforeEach } from "vitest";

// POST /api/forms/[formId]/submit — the parts that touch Resend and the
// unique index on (audience_id, email): two submits for the same new
// address must both succeed with one Resend contact, and the Resend
// mirror must run only after the local row exists.

const createContactMock = vi.fn();
vi.mock("@/src/lib/email/marketing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/marketing")>();
  return { ...actual, createContact: (...a: unknown[]) => createContactMock(...a) };
});

const beginConfirmationMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/src/lib/email/confirm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/confirm")>();
  return { ...actual, beginConfirmation: (...a: unknown[]) => beginConfirmationMock(...a) };
});

type Resp = { data: unknown; error: { code?: string; message?: string } | null };

// Per-table FIFO scripts for terminal awaits, plus an ordered log of the
// builder methods called on audience_contacts so we can check that the
// Resend mirror happens after the insert.
const ops: string[] = [];
const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

function buildSupabase(scripts: Record<string, Resp[]>) {
  const cursors: Record<string, number> = {};
  const next = (table: string): Resp => {
    const list = scripts[table] ?? [];
    const idx = cursors[table] ?? 0;
    cursors[table] = idx + 1;
    return list[idx] ?? { data: null, error: null };
  };
  const proxy = (table: string): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "then") {
            return (onFul: (v: Resp) => unknown, onRej: (e: unknown) => unknown) =>
              Promise.resolve(next(table)).then(onFul, onRej);
          }
          return (...args: unknown[]) => {
            if (table === "audience_contacts" && (prop === "insert" || prop === "update" || prop === "select")) {
              ops.push(`${prop}:${JSON.stringify(args[0] ?? null)}`);
            }
            if (prop === "single" || prop === "maybeSingle") return Promise.resolve(next(table));
            return proxy(table);
          };
        },
      }
    );
  return { from: (table: string) => proxy(table), rpc: rpcMock };
}

let currentSupabase: ReturnType<typeof buildSupabase>;
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => currentSupabase,
}));

const FORM = {
  id: "form-1",
  user_id: "user-1",
  project_id: "project-1",
  audience_id: "audience-1",
  sequence_id: null,
  is_active: true,
  redirect_url: null,
  thank_you_message: "Thanks!",
};

function submit(email: string, extra: Record<string, string> = {}) {
  return new Request("http://localhost/foo", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ email, ...extra }),
  }) as never;
}

async function POST(req: never) {
  const mod = await import("@/src/app/api/forms/[formId]/submit/route");
  return mod.POST(req, { params: Promise.resolve({ formId: "form-1" }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  ops.length = 0;
  createContactMock.mockResolvedValue({ ok: true, data: { id: "rc-1", email: "x", unsubscribed: false } });
});

describe("POST /api/forms/[formId]/submit — race and Resend ordering", () => {
  it("a losing concurrent insert (23505) is treated as the existing contact and still returns 200", async () => {
    currentSupabase = buildSupabase({
      lead_forms: [{ data: FORM, error: null }],
      audiences: [{ data: { id: "audience-1", name: "List", double_opt_in: false, resend_audience_id: "raud" }, error: null }],
      audience_contacts: [
        { data: null, error: null }, // first lookup: nothing yet
        { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } }, // insert loses
        { data: { id: "contact-1", status: "subscribed", unsubscribe_token: "t" }, error: null }, // re-read
      ],
    });

    const res = await POST(submit("alice@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, message: "Thanks!", pending: false });

    // The winner already mirrored them: the loser must not create a second Resend contact.
    expect(createContactMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("increment_form_submission", { form_id_param: "form-1" });
  });

  it("creates the Resend contact only after the local insert succeeds, then stores its id", async () => {
    currentSupabase = buildSupabase({
      lead_forms: [{ data: FORM, error: null }],
      audiences: [{ data: { id: "audience-1", name: "List", double_opt_in: false, resend_audience_id: "raud" }, error: null }],
      audience_contacts: [
        { data: null, error: null }, // lookup
        { data: { id: "contact-new", status: "subscribed" }, error: null }, // insert
        { data: null, error: null }, // update with resend id
      ],
    });

    const res = await POST(submit("bob@example.com", { first_name: "Bob" }));
    expect(res.status).toBe(200);

    expect(createContactMock).toHaveBeenCalledWith("raud", { email: "bob@example.com", first_name: "Bob", last_name: undefined });

    const insertAt = ops.findIndex((o) => o.startsWith("insert:"));
    const mirrorAt = ops.findIndex((o) => o.startsWith("update:") && o.includes("rc-1"));
    expect(insertAt).toBeGreaterThanOrEqual(0);
    expect(mirrorAt).toBeGreaterThan(insertAt);
    // The insert itself never carries a Resend id.
    expect(ops[insertAt]).toContain('"resend_contact_id":null');
  });

  it("a genuine insert failure is a 500 and never touches Resend", async () => {
    currentSupabase = buildSupabase({
      lead_forms: [{ data: FORM, error: null }],
      audiences: [{ data: { id: "audience-1", name: "List", double_opt_in: false, resend_audience_id: "raud" }, error: null }],
      audience_contacts: [
        { data: null, error: null },
        { data: null, error: { code: "42P01", message: "relation missing" } },
      ],
    });
    const res = await POST(submit("carol@example.com"));
    expect(res.status).toBe(500);
    expect(createContactMock).not.toHaveBeenCalled();
  });

  it("double opt-in: inserts as pending, sends the confirmation and does not mirror to Resend", async () => {
    currentSupabase = buildSupabase({
      lead_forms: [{ data: { ...FORM, sequence_id: "seq-1" }, error: null }],
      audiences: [{ data: { id: "audience-1", name: "List", double_opt_in: true, resend_audience_id: "raud" }, error: null }],
      audience_contacts: [
        { data: null, error: null },
        { data: { id: "contact-new", status: "pending" }, error: null },
      ],
      projects: [{ data: { name: "Acme", client_name: null }, error: null }],
    });
    const res = await POST(submit("dan@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, pending: true });
    expect(createContactMock).not.toHaveBeenCalled();
    expect(beginConfirmationMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contactId: "contact-new", email: "dan@example.com", userId: "user-1", brandName: "Acme" })
    );
    const insert = ops.find((o) => o.startsWith("insert:"));
    expect(insert).toContain('"status":"pending"');
    expect(insert).toContain('"pending_sequence_id":"seq-1"');
  });
});
