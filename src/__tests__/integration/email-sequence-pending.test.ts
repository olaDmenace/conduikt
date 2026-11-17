import { describe, it, expect, vi, beforeEach } from "vitest";

// The email series sender must never email someone who hasn't confirmed.
// The handler loads the contact and only proceeds for status 'subscribed';
// anything else (pending, suppressed, unsubscribed, bounced) cancels the
// enrollment and skips the send.

const sendMock = vi.fn();
vi.mock("@/src/lib/email/sequence-send", () => ({
  sendSequenceEmail: (...a: unknown[]) => sendMock(...a),
}));
const enqueueMock = vi.fn().mockResolvedValue({ inserted: true, id: "exec-next" });
vi.mock("@/src/lib/scheduler/enqueue", () => ({
  enqueueExecution: (...a: unknown[]) => enqueueMock(...a),
}));

import handler from "@/src/lib/scheduler/handlers/email-sequence-step";
import type { HandlerContext } from "@/src/lib/scheduler/types";

function makeDb(results: Record<string, unknown>) {
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  function chain(table: string) {
    const result = results[table] ?? { data: null, error: null };
    const self: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
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
  return { db: { from: (table: string) => chain(table), rpc: vi.fn() }, updates };
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

function ctx(db: unknown): HandlerContext {
  return {
    supabase: db as HandlerContext["supabase"],
    execution: {
      id: "exec1",
      user_id: "user1",
      execution_type: "email_sequence_step",
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

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockResolvedValue({ ok: true, resendEmailId: "em-1" });
});

describe("email_sequence_step handler and contact status", () => {
  for (const status of ["pending", "suppressed", "unsubscribed", "bounced", "complained"]) {
    it(`skips and cancels the enrollment when the contact is '${status}'`, async () => {
      const { db, updates } = makeDb({
        email_sequence_enrollments: { data: enrollment, error: null },
        audience_contacts: { data: { id: "c1", email: "a@x.com", status, unsubscribe_token: "t" }, error: null },
      });
      const out = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));
      expect(out).toMatchObject({ ok: true, result: { skipped: true, reason: status } });
      expect(sendMock).not.toHaveBeenCalled();
      expect(updates).toContainEqual({
        table: "email_sequence_enrollments",
        values: { status: "cancelled", cancellation_reason: status },
      });
    });
  }

  it("sends when the contact is subscribed", async () => {
    const { db } = makeDb({
      email_sequence_enrollments: { data: enrollment, error: null },
      audience_contacts: { data: { id: "c1", email: "a@x.com", status: "subscribed", unsubscribe_token: "t" }, error: null },
      email_sequence_steps: {
        data: {
          id: "s1",
          sequence_id: "seq1",
          step_order: 1,
          delay_hours: 0,
          subject_line: "Hi",
          asset_id: "as1",
          assets: { id: "as1", title: "Hi", content: { body_html: "<p>Hello</p>" } },
        },
        error: null,
      },
      profiles: { data: { email_usage_reset_at: null }, error: null },
    });
    const out = await handler({ enrollmentId: "enr1", stepOrder: 1 }, ctx(db));
    expect(out.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: "a@x.com", unsubscribeToken: "t" });
  });
});
