import { describe, it, expect, vi, beforeEach } from "vitest";

const enqueueMock = vi.fn().mockResolvedValue({ inserted: true, id: "exec-1" });
vi.mock("@/src/lib/scheduler/enqueue", () => ({
  enqueueExecution: (...args: unknown[]) => enqueueMock(...args),
}));

const createContactMock = vi.fn();
vi.mock("@/src/lib/email/marketing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/marketing")>();
  return {
    ...actual,
    createContact: (...args: unknown[]) => createContactMock(...args),
  };
});

// Resend is never hit: sendConfirmationEmail is exercised separately with the
// SDK mocked.
const resendSendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => resendSendMock(...args) };
  },
}));

import {
  buildConfirmUrl,
  confirmContactByToken,
  generateConfirmToken,
  isConfirmTokenExpired,
  isWellFormedConfirmToken,
  sendConfirmationEmail,
  confirmationEmailHtml,
  CONFIRM_TTL_DAYS,
} from "@/src/lib/email/confirm";

// Table-driven supabase stand-in: each table gets a FIFO script of results
// for terminal awaits; updates/inserts/upserts are captured.
type Resp = { data: unknown; error: { message: string } | null };
function makeDb(scripts: Record<string, Resp[]>) {
  const cursors: Record<string, number> = {};
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const upserts: Array<{ table: string; values: Record<string, unknown> }> = [];
  const next = (table: string): Resp => {
    const list = scripts[table] ?? [];
    const i = cursors[table] ?? 0;
    cursors[table] = i + 1;
    return list[i] ?? { data: null, error: null };
  };
  const chain = (table: string): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "then") return (res: (v: Resp) => unknown) => Promise.resolve(next(table)).then(res);
          if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve(next(table));
          if (prop === "update")
            return (values: Record<string, unknown>) => {
              updates.push({ table, values });
              return chain(table);
            };
          if (prop === "upsert")
            return (values: Record<string, unknown>) => {
              upserts.push({ table, values });
              return chain(table);
            };
          return () => chain(table);
        },
      }
    );
  return { db: { from: (t: string) => chain(t) }, updates, upserts };
}

const TOKEN = "a".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  createContactMock.mockResolvedValue({ ok: true, data: { id: "rc-1", email: "x", unsubscribed: false } });
  resendSendMock.mockResolvedValue({ data: { id: "em-1" }, error: null });
});

describe("confirm tokens", () => {
  it("generates 64-char hex tokens that are unique", () => {
    const a = generateConfirmToken();
    const b = generateConfirmToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
    expect(isWellFormedConfirmToken(a)).toBe(true);
  });

  it("rejects malformed tokens before touching the database", () => {
    expect(isWellFormedConfirmToken("short")).toBe(false);
    expect(isWellFormedConfirmToken("Z".repeat(64))).toBe(false);
    expect(isWellFormedConfirmToken(123)).toBe(false);
  });

  it("builds the /confirm URL from NEXT_PUBLIC_APP_URL", () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    try {
      expect(buildConfirmUrl(TOKEN)).toBe(`https://app.example.com/confirm?token=${TOKEN}`);
    } finally {
      if (orig === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = orig;
    }
  });

  it("expires after the TTL and not before", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const fresh = new Date(now.getTime() - 86_400_000).toISOString();
    const old = new Date(now.getTime() - (CONFIRM_TTL_DAYS + 1) * 86_400_000).toISOString();
    expect(isConfirmTokenExpired(fresh, now)).toBe(false);
    expect(isConfirmTokenExpired(old, now)).toBe(true);
    expect(isConfirmTokenExpired(null, now)).toBe(false);
  });
});

describe("confirmContactByToken", () => {
  it("returns invalid for a token that matches nothing", async () => {
    const { db } = makeDb({ audience_contacts: [{ data: null, error: null }] });
    const out = await confirmContactByToken(db as never, TOKEN);
    expect(out).toEqual({ ok: false, state: "invalid" });
  });

  it("returns invalid without a lookup for a malformed token", async () => {
    const { db } = makeDb({});
    const out = await confirmContactByToken(db as never, "nope");
    expect(out).toEqual({ ok: false, state: "invalid" });
  });

  it("returns expired for an old pending contact and leaves it alone", async () => {
    const { db, updates } = makeDb({
      audience_contacts: [
        {
          data: {
            id: "c1",
            email: "a@x.com",
            status: "pending",
            audience_id: "aud1",
            confirm_sent_at: "2020-01-01T00:00:00Z",
            pending_sequence_id: null,
            resend_contact_id: null,
          },
          error: null,
        },
      ],
    });
    const out = await confirmContactByToken(db as never, TOKEN);
    expect(out).toEqual({ ok: false, state: "expired" });
    expect(updates).toHaveLength(0);
  });

  it("flips a pending contact to subscribed, mirrors to Resend and enrols in the waiting series", async () => {
    const { db, updates, upserts } = makeDb({
      audience_contacts: [
        {
          data: {
            id: "c1",
            email: "a@x.com",
            first_name: "A",
            last_name: null,
            status: "pending",
            audience_id: "aud1",
            confirm_sent_at: new Date().toISOString(),
            pending_sequence_id: "seq1",
            resend_contact_id: null,
          },
          error: null,
        },
        { data: null, error: null }, // update result
      ],
      audiences: [{ data: { id: "aud1", user_id: "u1", resend_audience_id: "raud" }, error: null }],
      email_sequence_steps: [{ data: { step_order: 1, delay_hours: 0 }, error: null }],
      email_sequence_enrollments: [{ data: { id: "enr1" }, error: null }],
    });

    const out = await confirmContactByToken(db as never, TOKEN);
    expect(out).toMatchObject({ ok: true, state: "confirmed", email: "a@x.com", contactId: "c1" });

    expect(createContactMock).toHaveBeenCalledWith("raud", { email: "a@x.com", first_name: "A", last_name: undefined });

    const flip = updates.find((u) => u.table === "audience_contacts");
    expect(flip?.values).toMatchObject({
      status: "subscribed",
      pending_sequence_id: null,
      resend_contact_id: "rc-1",
    });
    expect(typeof flip?.values.confirmed_at).toBe("string");
    // The token stays on the row: the /confirm page resolves the owner's
    // brand by it after /api/confirm redirects back.
    expect(flip?.values).not.toHaveProperty("confirm_token");

    expect(upserts).toEqual([
      {
        table: "email_sequence_enrollments",
        values: { user_id: "u1", sequence_id: "seq1", contact_id: "c1", audience_id: "aud1" },
      },
    ]);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][1]).toMatchObject({
      executionType: "email_sequence_step",
      payload: { enrollmentId: "enr1", stepOrder: 1 },
      idempotencyKey: "seq-step:enr1:1",
    });
  });

  it("does not enrol when no series is waiting", async () => {
    const { db, upserts } = makeDb({
      audience_contacts: [
        {
          data: {
            id: "c1",
            email: "a@x.com",
            status: "pending",
            audience_id: "aud1",
            confirm_sent_at: new Date().toISOString(),
            pending_sequence_id: null,
            resend_contact_id: "already",
          },
          error: null,
        },
        { data: null, error: null },
      ],
      audiences: [{ data: { id: "aud1", user_id: "u1", resend_audience_id: null }, error: null }],
    });
    const out = await confirmContactByToken(db as never, TOKEN);
    expect(out.ok).toBe(true);
    expect(upserts).toHaveLength(0);
    expect(enqueueMock).not.toHaveBeenCalled();
    expect(createContactMock).not.toHaveBeenCalled();
  });

  it("is idempotent: a confirmed contact comes back as 'already' with no writes", async () => {
    const { db, updates } = makeDb({
      audience_contacts: [
        { data: { id: "c1", email: "a@x.com", status: "subscribed", audience_id: "aud1" }, error: null },
      ],
    });
    const out = await confirmContactByToken(db as never, TOKEN);
    expect(out).toMatchObject({ ok: true, state: "already" });
    expect(updates).toHaveLength(0);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("never tells an unsubscribed, suppressed or bounced contact they are subscribed", async () => {
    for (const status of ["unsubscribed", "suppressed", "bounced", "complained"]) {
      const { db, updates } = makeDb({
        audience_contacts: [{ data: { id: "c1", email: "a@x.com", status, audience_id: "aud1" }, error: null }],
      });
      const out = await confirmContactByToken(db as never, TOKEN);
      expect(out).toEqual({ ok: false, state: "not_pending" });
      expect(updates).toHaveLength(0);
    }
    expect(createContactMock).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});

describe("confirmation email", () => {
  it("escapes the brand name and includes the link as a button and as plain text", () => {
    const html = confirmationEmailHtml({ brandName: "A <b> & C", confirmUrl: "https://x.com/confirm?token=abc" });
    expect(html).toContain("A &lt;b&gt; &amp; C");
    expect(html).not.toContain("<b>");
    // Button href, fallback link href, fallback link text.
    expect(html.match(/https:\/\/x\.com\/confirm\?token=abc/g)?.length).toBe(3);
  });

  it("sends through Resend with text + html and a double_opt_in tag", async () => {
    const orig = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test";
    try {
      const out = await sendConfirmationEmail({
        to: "a@x.com",
        from: "Acme <hello@acme.com>",
        brandName: "Acme",
        confirmUrl: "https://x.com/confirm?token=abc",
      });
      expect(out).toEqual({ ok: true });
      expect(resendSendMock).toHaveBeenCalledTimes(1);
      const arg = resendSendMock.mock.calls[0][0];
      expect(arg.from).toBe("Acme <hello@acme.com>");
      expect(arg.to).toEqual(["a@x.com"]);
      expect(arg.text).toContain("https://x.com/confirm?token=abc");
      expect(arg.tags).toEqual([{ name: "type", value: "double_opt_in" }]);
    } finally {
      if (orig === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = orig;
    }
  });

  it("fails cleanly when RESEND_API_KEY is missing", async () => {
    const orig = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const out = await sendConfirmationEmail({
        to: "a@x.com",
        from: "Acme <hello@acme.com>",
        brandName: "Acme",
        confirmUrl: "https://x.com",
      });
      expect(out.ok).toBe(false);
      expect(resendSendMock).not.toHaveBeenCalled();
    } finally {
      if (orig !== undefined) process.env.RESEND_API_KEY = orig;
    }
  });
});
