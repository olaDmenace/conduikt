import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));
vi.mock("@/src/lib/crypto/tokens", () => ({
  decryptToken: <T,>(v: T) => v,
  encryptToken: <T,>(v: T) => v,
  isEncryptionConfigured: () => false,
}));

const enqueueMock = vi.fn().mockResolvedValue({ inserted: true, id: "exec-next" });
vi.mock("../enqueue", () => ({
  enqueueExecution: (...args: unknown[]) => enqueueMock(...args),
}));

import handler, { messageFromContent } from "./whatsapp-step";
import { getHandler } from "../registry";
import type { HandlerContext } from "../types";

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

// Table-driven thenable chain: `results[table]` is returned for any query
// on that table; inserts/updates are captured.
function makeDb(results: Record<string, unknown>) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  function chain(table: string) {
    const result = results[table] ?? { data: null, error: null };
    const self: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
          if (prop === "insert")
            return (row: Record<string, unknown>) => {
              inserts.push({ table, row });
              return chain(table);
            };
          if (prop === "update")
            return (values: Record<string, unknown>) => {
              updates.push({ table, values });
              return chain(table);
            };
          return () => self;
        },
      }
    );
    return self;
  }
  return { db: { from: (table: string) => chain(table) }, inserts, updates };
}

const enrollment = {
  id: "enr1",
  user_id: "user1",
  sequence_id: "seq1",
  contact_id: "c1",
  audience_id: "aud1",
  status: "active",
  current_step_order: 0,
};

const step = {
  id: "step1",
  sequence_id: "seq1",
  step_order: 1,
  delay_hours: 0,
  channel: "whatsapp",
  asset_id: "asset1",
  assets: { id: "asset1", title: "Hello", content: { body_text: "Hi {{name}}, thanks for signing up." } },
};

function ctx(db: unknown): HandlerContext {
  return {
    supabase: db as HandlerContext["supabase"],
    execution: {
      id: "exec1",
      user_id: "user1",
      execution_type: "whatsapp_step",
      payload: {},
      scheduled_for: new Date().toISOString(),
      status: "running",
      attempts: 1,
      max_attempts: 3,
      last_error: null,
      idempotency_key: null,
      parent_id: null,
      parent_type: null,
      result: null,
      ran_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

describe("whatsapp_step handler", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    enqueueMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("registers itself as whatsapp_step", () => {
    expect(getHandler("whatsapp_step")).toBe(handler);
  });

  it("messageFromContent prefers a template, then text fields", () => {
    expect(messageFromContent({ template_name: "review_request", language_code: "en_GB" })).toEqual({
      template: { templateName: "review_request", languageCode: "en_GB", components: undefined },
    });
    expect(messageFromContent({ scheduled_text: "Hey" })).toEqual({ text: "Hey" });
    expect(messageFromContent({ raw: "  " })).toEqual({});
    expect(messageFromContent(null)).toEqual({});
  });

  it("rejects a bad payload without retrying", async () => {
    const { db } = makeDb({});
    const r = await handler({ nope: true }, ctx(db));
    expect(r).toEqual({ ok: false, error: "Invalid payload shape", retryable: false });
  });

  it("does not send when the contact has not opted in, and moves the sequence on", async () => {
    const { db, inserts, updates } = makeDb({
      email_sequence_enrollments: { data: enrollment, error: null },
      audience_contacts: { data: { id: "c1", phone: "08031234567", whatsapp_opt_in: false, status: "subscribed" } },
      email_sequence_steps: { data: { step_order: 2, delay_hours: 24, channel: "email" } },
    });

    const r = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));

    expect(r).toEqual({ ok: true, result: { skipped: true, reason: "no_whatsapp_consent" } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(inserts.filter((i) => i.table === "whatsapp_events")).toHaveLength(0);
    // Progress still bumped and the next (email) step queued on its own handler.
    expect(updates.some((u) => u.table === "email_sequence_enrollments" && u.values.current_step_order === 1)).toBe(true);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][1]).toMatchObject({
      executionType: "email_sequence_step",
      payload: { enrollmentId: "enr1", stepOrder: 2 },
      idempotencyKey: "seq-step:enr1:2",
    });
  });

  it("skips with no_phone when the contact has consent but no number", async () => {
    const { db } = makeDb({
      email_sequence_enrollments: { data: enrollment },
      audience_contacts: { data: { id: "c1", phone: null, whatsapp_opt_in: true, status: "subscribed" } },
      email_sequence_steps: { data: null },
    });
    const r = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));
    expect(r).toEqual({ ok: true, result: { skipped: true, reason: "no_phone" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records the missing connection, skips the step and moves the sequence on", async () => {
    const { db, inserts, updates } = makeDb({
      email_sequence_enrollments: { data: enrollment },
      audience_contacts: { data: { id: "c1", phone: "08031234567", whatsapp_opt_in: true, status: "subscribed" } },
      email_sequence_steps: { data: step },
      audiences: { data: { project_id: "proj1" } },
      connected_accounts: { data: null },
    });
    const r = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));
    expect(r).toMatchObject({ ok: true, result: { skipped: true, reason: "whatsapp_not_connected" } });
    expect(fetchMock).not.toHaveBeenCalled();
    const failed = inserts.find((i) => i.table === "whatsapp_events");
    expect(failed?.row).toMatchObject({ event_type: "failed" });
    // The enrollment is not left stuck at this step.
    expect(updates.some((u) => u.table === "email_sequence_enrollments" && (u.values as { current_step_order?: number }).current_step_order === 1)).toBe(true);
  });

  it("sends to an opted-in contact, records the event and queues the next WhatsApp step", async () => {
    fetchMock.mockResolvedValueOnce(json({ messages: [{ id: "wamid.42" }] }));

    // email_sequence_steps is queried twice (this step, then the next); the
    // proxy returns the same result both times, so make the "next" lookup
    // happen through a one-shot override.
    let stepCalls = 0;
    const { db, inserts, updates } = makeDb({
      email_sequence_enrollments: { data: enrollment },
      audience_contacts: { data: { id: "c1", phone: "0803 123 4567", whatsapp_opt_in: true, status: "subscribed" } },
      audiences: { data: { project_id: "proj1" } },
      connected_accounts: { data: { id: "conn1", project_id: "proj1", platform_user_id: "PNID1", access_token: "tok", metadata: {} } },
    });
    const baseFrom = db.from;
    db.from = (table: string) => {
      if (table === "email_sequence_steps") {
        stepCalls++;
        const result =
          stepCalls === 1 ? { data: step } : { data: { step_order: 2, delay_hours: 48, channel: "whatsapp" } };
        const self: Record<string, unknown> = new Proxy(
          {},
          {
            get(_t, prop) {
              if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
              return () => self;
            },
          }
        );
        return self as ReturnType<typeof baseFrom>;
      }
      return baseFrom(table);
    };

    const r = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));

    expect(r).toEqual({
      ok: true,
      result: { wa_message_id: "wamid.42", step_order: 1, next_step_order: 2 },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://graph.facebook.com/v21.0/PNID1/messages");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ to: "2348031234567", type: "text", text: { body: "Hi {{name}}, thanks for signing up." } });

    const sent = inserts.find((i) => i.table === "whatsapp_events");
    expect(sent?.row).toMatchObject({
      project_id: "proj1",
      direction: "outbound",
      event_type: "sent",
      contact_id: "c1",
      enrollment_id: "enr1",
      wa_message_id: "wamid.42",
      phone: "2348031234567",
    });

    expect(updates.some((u) => u.table === "email_sequence_enrollments" && u.values.current_step_order === 1)).toBe(true);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][1]).toMatchObject({
      userId: "user1",
      executionType: "whatsapp_step",
      payload: { enrollmentId: "enr1", stepOrder: 2 },
      idempotencyKey: "seq-step:enr1:2",
      parentType: "email_sequence_enrollment",
    });
  });

  it("records a failed event and skips the step on Meta's permanent errors instead of retrying", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: "Template not found", code: 132001 } }, false, 400));
    const { db, inserts } = makeDb({
      email_sequence_enrollments: { data: enrollment },
      audience_contacts: { data: { id: "c1", phone: "08031234567", whatsapp_opt_in: true, status: "subscribed" } },
      email_sequence_steps: { data: { ...step, assets: { content: { template_name: "missing_tpl" } } } },
      audiences: { data: { project_id: "proj1" } },
      connected_accounts: { data: { id: "conn1", project_id: "proj1", platform_user_id: "PNID1", access_token: "tok", metadata: {} } },
    });
    const r = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));
    expect(r).toMatchObject({ ok: true, result: { skipped: true, reason: "send_failed", code: 132001, error: "Template not found" } });
    const failed = inserts.find((i) => i.table === "whatsapp_events");
    expect(failed?.row).toMatchObject({ event_type: "failed", body: "Template not found" });
  });
});
