// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));

import {
  buildReviewEmail,
  buildReviewWhatsApp,
  chooseChannel,
  isGoogleReviewLink,
  parseReviewCsv,
  reviewLinkProblem,
  reviewRequestText,
  reviewUrlOf,
  sendReviewRequest,
  sendReviewRequests,
  usableReviewUrl,
  EMAIL_BATCH_SIZE,
  EMAIL_BATCH_GAP_MS,
  REVIEW_LINK_MISSING_MESSAGE,
  REVIEW_LINK_NOT_GOOGLE_MESSAGE,
  WHATSAPP_GAP_MS,
  type OutgoingEmail,
  type SendDeps,
} from "@/src/lib/reviews/send";
import type { WhatsAppConnection } from "@/src/lib/integrations/whatsapp";

const REVIEW_URL = "https://g.page/r/abc123/review";

describe("review message builder", () => {
  it("says thanks, names the business and links the review page", () => {
    const text = reviewRequestText({ businessName: "Bright Smiles Dental", reviewUrl: REVIEW_URL });
    expect(text).toBe(
      `Thanks for choosing Bright Smiles Dental. If you have a minute, a Google review helps others find us: ${REVIEW_URL}`
    );
  });

  it("builds the same ask for email, with a greeting and plain-text and html bodies", () => {
    const mail = buildReviewEmail({ businessName: "Bright Smiles Dental", reviewUrl: REVIEW_URL, customerName: "Ngozi Okafor" });
    expect(mail.subject).toContain("Bright Smiles Dental");
    expect(mail.text).toContain("Hi Ngozi,");
    expect(mail.text).toContain(REVIEW_URL);
    expect(mail.html).toContain(`href="${REVIEW_URL}"`);
    expect(mail.html).not.toContain("<script");
  });

  it("builds a WhatsApp variant with a greeting and an opt-out line", () => {
    const body = buildReviewWhatsApp({ businessName: "Bright Smiles Dental", reviewUrl: REVIEW_URL, customerName: "Tunde" });
    expect(body.startsWith("Hi Tunde, thanks for choosing Bright Smiles Dental.")).toBe(true);
    expect(body).toContain(REVIEW_URL);
    expect(body).toContain("Reply STOP to opt out.");
  });

  it("escapes html in the business name", () => {
    const mail = buildReviewEmail({ businessName: "<b>Acme</b>", reviewUrl: REVIEW_URL });
    expect(mail.html).toContain("&lt;b&gt;Acme&lt;/b&gt;");
  });
});

describe("chooseChannel", () => {
  it("prefers WhatsApp when the contact opted in and the project is connected", () => {
    expect(
      chooseChannel({ email: "a@b.com", phone: "08031234567", whatsappOptIn: true, whatsappConnected: true })
    ).toEqual({ channel: "whatsapp" });
  });

  it("falls back to email without opt-in", () => {
    expect(
      chooseChannel({ email: "a@b.com", phone: "08031234567", whatsappOptIn: false, whatsappConnected: true })
    ).toEqual({ channel: "email" });
  });

  it("falls back to email without a WhatsApp connection", () => {
    expect(
      chooseChannel({ email: "a@b.com", phone: "08031234567", whatsappOptIn: true, whatsappConnected: false })
    ).toEqual({ channel: "email" });
  });

  it("honours an explicit email request even when WhatsApp would work", () => {
    expect(
      chooseChannel({ requested: "email", email: "a@b.com", phone: "08031234567", whatsappOptIn: true, whatsappConnected: true })
    ).toEqual({ channel: "email" });
  });

  it("skips with a plain reason when nothing can reach the customer", () => {
    expect(chooseChannel({ email: null, phone: null, whatsappOptIn: false, whatsappConnected: false })).toEqual({
      channel: null,
      reason: "Add an email address or a phone number",
    });
    expect(chooseChannel({ email: null, phone: "08031234567", whatsappOptIn: false, whatsappConnected: true })).toEqual({
      channel: null,
      reason: "This customer has not agreed to WhatsApp messages",
    });
    expect(chooseChannel({ email: null, phone: "08031234567", whatsappOptIn: true, whatsappConnected: false })).toEqual({
      channel: null,
      reason: "WhatsApp is not connected for this project",
    });
    expect(chooseChannel({ email: "not-an-email", phone: null, whatsappOptIn: false, whatsappConnected: false })).toEqual({
      channel: null,
      reason: "That email address does not look valid",
    });
  });
});

describe("parseReviewCsv", () => {
  it("reads name,email,phone per line and skips a header", () => {
    const { rows, skippedLines } = parseReviewCsv(
      "name,email,phone\nNgozi Okafor, ngozi@example.com, 0803 123 4567\nTunde Bello,,0802 555 0199\n"
    );
    expect(rows).toEqual([
      { name: "Ngozi Okafor", email: "ngozi@example.com", phone: "0803 123 4567" },
      { name: "Tunde Bello", email: null, phone: "0802 555 0199" },
    ]);
    expect(skippedLines).toEqual([]);
  });

  it("accepts email and phone in either order, and semicolons or tabs", () => {
    const { rows } = parseReviewCsv("Ada; 08031234567; ada@example.com\nBola\tbola@example.com");
    expect(rows[0]).toEqual({ name: "Ada", email: "ada@example.com", phone: "08031234567" });
    expect(rows[1]).toEqual({ name: "Bola", email: "bola@example.com", phone: null });
  });

  it("reports lines with no name or no way to reach the person", () => {
    const { rows, skippedLines } = parseReviewCsv("Only Name\n,x@y.com\nGood, g@y.com");
    expect(rows).toHaveLength(1);
    expect(skippedLines).toEqual([1, 2]);
  });
});

describe("the review link", () => {
  it("accepts a web address and adds https when missing", () => {
    expect(reviewUrlOf({ review_url: "g.page/r/abc/review" })).toBe("https://g.page/r/abc/review");
    expect(reviewUrlOf({ review_url: REVIEW_URL })).toBe(REVIEW_URL);
  });

  it("rejects blanks and junk", () => {
    expect(reviewUrlOf({ review_url: "" })).toBeNull();
    expect(reviewUrlOf({ review_url: null })).toBeNull();
    expect(reviewUrlOf({ review_url: "javascript:alert(1)" })).toBeNull();
  });

  it("knows Google's review, maps and profile hosts", () => {
    for (const url of [
      REVIEW_URL,
      "https://maps.app.goo.gl/AbCdEf",
      "https://goo.gl/maps/AbCdEf",
      "https://g.co/kgs/AbCdEf",
      "https://search.google.com/local/writereview?placeid=ChIJ",
      "https://www.google.com/maps/place/Bright+Smiles",
      "https://maps.google.com/?cid=123",
      "https://www.google.com.ng/maps/place/Bright+Smiles",
      "https://business.google.com/n/123/profile",
    ]) {
      expect(isGoogleReviewLink(url), url).toBe(true);
    }
  });

  it("refuses anything else, including look-alikes", () => {
    for (const url of [
      "https://example.com/reviews",
      "https://google.com.evil.io/maps",
      "https://notgoogle.com/maps",
      "https://g.page.evil.io/r/abc",
      "https://yourbank-login.com/",
    ]) {
      expect(isGoogleReviewLink(url), url).toBe(false);
    }
  });

  it("names the problem in the owner's words, or none", () => {
    expect(reviewLinkProblem({ review_url: null })).toBe(REVIEW_LINK_MISSING_MESSAGE);
    expect(reviewLinkProblem({ review_url: "https://example.com/r" })).toBe(REVIEW_LINK_NOT_GOOGLE_MESSAGE);
    expect(reviewLinkProblem({ review_url: REVIEW_URL })).toBeNull();
    expect(usableReviewUrl({ review_url: "https://example.com/r" })).toBeNull();
    expect(usableReviewUrl({ review_url: "g.page/r/abc/review" })).toBe("https://g.page/r/abc/review");
  });
});

// ---------------------------------------------------------------------------
// Sending with a fake database
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/**
 * audience_contacts: select().eq().in() resolves to the contacts given.
 * review_requests: insert(rows).select() stores and returns them;
 * update(patch).in("id", ids) applies the patch to those rows.
 */
function fakeDb(opts: { contacts?: Row[] } = {}) {
  const rows: Row[] = [];
  const updates: Array<{ patch: Row; ids: string[] }> = [];
  const inserts: Row[][] = [];

  const contactChain = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(async () => ({ data: opts.contacts ?? [] })),
  };
  contactChain.select.mockReturnValue(contactChain);
  contactChain.eq.mockReturnValue(contactChain);

  const requestsTable = {
    insert: vi.fn((batch: Row[]) => {
      inserts.push(batch);
      const stored = batch.map((row) => ({ ...row }));
      rows.push(...stored);
      return { select: async () => ({ data: stored, error: null }) };
    }),
    update: vi.fn((patch: Row) => ({
      in: async (_col: string, ids: string[]) => {
        updates.push({ patch, ids });
        for (const r of rows) if (ids.includes(r.id as string)) Object.assign(r, patch);
        return { error: null };
      },
    })),
  };

  const db = {
    from: vi.fn((table: string) => (table === "audience_contacts" ? contactChain : requestsTable)),
  };
  return { db, rows, updates, inserts, contactChain };
}

const CONN: WhatsAppConnection = {
  id: "ca-1",
  projectId: "p-1",
  phoneNumberId: "pn-1",
  displayPhoneNumber: null,
  accessToken: "secret",
};

function deps(overrides: Partial<SendDeps> = {}): Partial<SendDeps> {
  return {
    sendEmails: vi.fn(async (messages) => messages.map(() => ({ ok: true as const }))),
    sendWhatsApp: vi.fn(async () => ({ ok: true as const, messageId: "wa-1", to: "2348031234567" })),
    getConnection: vi.fn(async () => CONN),
    now: () => new Date("2026-11-17T10:00:00Z"),
    sleep: vi.fn(async () => {}),
    ...overrides,
  };
}

type Mock = ReturnType<typeof vi.fn>;

const PROJECT = { id: "p-1", name: "Bright Smiles Dental", review_url: REVIEW_URL };

describe("sendReviewRequest (one customer)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends by email from the shared mailbox with the business as display name and records 'sent'", async () => {
    const { db, rows, updates } = fakeDb();
    const d = deps();
    const row = await sendReviewRequest(db as never, { project: PROJECT, name: "Ngozi Okafor", email: "Ngozi@Example.com" }, d);

    expect(d.sendEmails).toHaveBeenCalledTimes(1);
    const [messages] = (d.sendEmails as Mock).mock.calls[0];
    expect(messages).toHaveLength(1);
    expect(messages[0].from).toBe("Bright Smiles Dental <hello@contacts.conduikt.com>");
    expect(messages[0].to).toBe("ngozi@example.com");
    expect(messages[0].text).toContain(REVIEW_URL);
    expect(d.sendWhatsApp).not.toHaveBeenCalled();

    expect(row.status).toBe("sent");
    expect(row.channel).toBe("email");
    expect(row.sent_at).toBe("2026-11-17T10:00:00.000Z");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("sent");
    expect(updates).toEqual([{ patch: { status: "sent", sent_at: "2026-11-17T10:00:00.000Z", error: null }, ids: [row.id] }]);
  });

  it("sends by WhatsApp when the stored contact opted in and the project is connected", async () => {
    const { db } = fakeDb({ contacts: [{ id: "c-1", email: null, phone: "2348031234567", whatsapp_opt_in: true }] });
    const d = deps();
    const row = await sendReviewRequest(db as never, { project: PROJECT, name: "Tunde", phone: "0803 123 4567" }, d);

    expect(d.sendWhatsApp).toHaveBeenCalledTimes(1);
    const [conn, to, body] = (d.sendWhatsApp as Mock).mock.calls[0];
    expect(conn).toBe(CONN);
    expect(to).toBe("2348031234567");
    expect(body).toContain(REVIEW_URL);
    expect(row.channel).toBe("whatsapp");
    expect(row.status).toBe("sent");
    expect(row.contact_id).toBe("c-1");
  });

  it("does not use WhatsApp for a typed number with no stored opt-in; falls back to email", async () => {
    const { db } = fakeDb();
    const d = deps();
    const row = await sendReviewRequest(
      db as never,
      { project: PROJECT, name: "Ada", email: "ada@example.com", phone: "08031234567", requested: "whatsapp" },
      d
    );
    expect(d.sendWhatsApp).not.toHaveBeenCalled();
    expect(d.sendEmails).toHaveBeenCalledTimes(1);
    expect(row.channel).toBe("email");
  });

  it("records 'failed' with the provider's error when the send fails", async () => {
    const { db } = fakeDb();
    const d = deps({ sendEmails: vi.fn(async () => [{ ok: false as const, error: "Resend said no" }]) });
    const row = await sendReviewRequest(db as never, { project: PROJECT, name: "Ada", email: "ada@example.com" }, d);
    expect(row.status).toBe("failed");
    expect(row.error).toBe("Resend said no");
  });

  it("records 'skipped' without sending when the project has no review link", async () => {
    const { db } = fakeDb();
    const d = deps();
    const row = await sendReviewRequest(
      db as never,
      { project: { ...PROJECT, review_url: null }, name: "Ada", email: "ada@example.com" },
      d
    );
    expect(row.status).toBe("skipped");
    expect(row.error).toBe(REVIEW_LINK_MISSING_MESSAGE);
    expect(d.sendEmails).not.toHaveBeenCalled();
  });

  it("records 'skipped' without sending when the review link is not Google's", async () => {
    const { db } = fakeDb();
    const d = deps();
    const row = await sendReviewRequest(
      db as never,
      { project: { ...PROJECT, review_url: "https://yourbank-login.example/verify" }, name: "Ada", email: "ada@example.com" },
      d
    );
    expect(row.status).toBe("skipped");
    expect(row.error).toBe(REVIEW_LINK_NOT_GOOGLE_MESSAGE);
    expect(d.sendEmails).not.toHaveBeenCalled();
    expect(d.sendWhatsApp).not.toHaveBeenCalled();
  });

  it("records 'skipped' with the reason when no channel can reach the customer", async () => {
    const { db } = fakeDb();
    const d = deps({ getConnection: vi.fn(async () => null) });
    const row = await sendReviewRequest(db as never, { project: PROJECT, name: "Ada", phone: "08031234567" }, d);
    expect(row.status).toBe("skipped");
    expect(row.error).toBe("WhatsApp is not connected for this project");
  });
});

describe("sendReviewRequests (many at once)", () => {
  beforeEach(() => vi.clearAllMocks());

  const customers = (n: number, prefix = "c") =>
    Array.from({ length: n }, (_, i) => ({ name: `Customer ${i}`, email: `${prefix}${i}@example.com` }));

  it("writes every row as queued in one insert before any send, then updates in groups", async () => {
    const { db, inserts, updates } = fakeDb();
    let insertsSeenAtSend = -1;
    const d = deps({
      sendEmails: vi.fn(async (messages: OutgoingEmail[]) => {
        insertsSeenAtSend = inserts.length;
        return messages.map((m, i) => (i === 1 ? { ok: false as const, error: `Bounced: ${m.to}` } : { ok: true as const }));
      }),
    });

    const rows = await sendReviewRequests(db as never, PROJECT, customers(3), d);

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toHaveLength(3);
    expect(inserts[0].every((r) => r.status === "queued")).toBe(true);
    expect(insertsSeenAtSend).toBe(1);

    expect(rows.map((r) => r.status)).toEqual(["sent", "failed", "sent"]);
    expect(rows[1].error).toBe("Bounced: c1@example.com");
    // One update for the sent ids, one for the one failure message.
    expect(updates).toHaveLength(2);
    expect(updates[0].ids).toEqual([rows[0].id, rows[2].id]);
    expect(updates[1]).toEqual({ patch: { status: "failed", error: "Bounced: c1@example.com" }, ids: [rows[1].id] });
  });

  it("sends emails in chunks of at most 100 with a gap between provider calls", async () => {
    const { db } = fakeDb();
    const d = deps();
    const rows = await sendReviewRequests(db as never, PROJECT, customers(150), d);

    const calls = (d.sendEmails as Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toHaveLength(EMAIL_BATCH_SIZE);
    expect(calls[1][0]).toHaveLength(50);
    expect(d.sleep).toHaveBeenCalledTimes(1);
    expect(d.sleep).toHaveBeenCalledWith(EMAIL_BATCH_GAP_MS);
    expect(rows.filter((r) => r.status === "sent")).toHaveLength(150);
  });

  it("sends WhatsApp one at a time with a breath between messages", async () => {
    const { db } = fakeDb({
      contacts: [
        { id: "c-1", email: null, phone: "2348031234567", whatsapp_opt_in: true },
        { id: "c-2", email: null, phone: "2348031234568", whatsapp_opt_in: true },
      ],
    });
    const d = deps();
    const rows = await sendReviewRequests(
      db as never,
      PROJECT,
      [
        { name: "A", phone: "0803 123 4567" },
        { name: "B", phone: "0803 123 4568" },
      ],
      d
    );
    expect(d.getConnection).toHaveBeenCalledTimes(1);
    expect(d.sendWhatsApp).toHaveBeenCalledTimes(2);
    expect(d.sleep).toHaveBeenCalledTimes(1);
    expect(d.sleep).toHaveBeenCalledWith(WHATSAPP_GAP_MS);
    expect(rows.map((r) => [r.channel, r.status, r.contact_id])).toEqual([
      ["whatsapp", "sent", "c-1"],
      ["whatsapp", "sent", "c-2"],
    ]);
  });

  it("marks a whole chunk failed when the provider call throws, and still returns every row", async () => {
    const { db } = fakeDb();
    const d = deps({
      sendEmails: vi.fn(async () => {
        throw new Error("Resend is down");
      }),
    });
    const rows = await sendReviewRequests(db as never, PROJECT, customers(3), d);
    expect(rows.map((r) => r.status)).toEqual(["failed", "failed", "failed"]);
    expect(rows[0].error).toBe("Resend is down");
  });

  it("keeps skipped rows out of the sends but in the result, in input order", async () => {
    const { db } = fakeDb();
    const d = deps({ getConnection: vi.fn(async () => null) });
    const rows = await sendReviewRequests(
      db as never,
      PROJECT,
      [
        { name: "A", email: "a@example.com" },
        { name: "B", phone: "08031234567" },
        { name: "C", email: "c@example.com" },
      ],
      d
    );
    expect(rows.map((r) => r.status)).toEqual(["sent", "skipped", "sent"]);
    expect(rows[1].error).toBe("WhatsApp is not connected for this project");
    expect((d.sendEmails as Mock).mock.calls[0][0].map((m: { to: string }) => m.to)).toEqual(["a@example.com", "c@example.com"]);
  });

  it("returns nothing and touches nothing for an empty list", async () => {
    const { db } = fakeDb();
    const d = deps();
    expect(await sendReviewRequests(db as never, PROJECT, [], d)).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });
});

