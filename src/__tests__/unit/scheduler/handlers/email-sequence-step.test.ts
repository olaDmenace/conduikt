import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the send helper so tests don't actually hit Resend. Each test
// configures the mock's return value before calling the handler.
const sendMock = vi.fn();
vi.mock("@/src/lib/email/sequence-send", () => ({
  sendSequenceEmail: (...args: unknown[]) => sendMock(...args),
}));

// Mock the enqueue helper so we can verify next-step scheduling without
// modeling a full insert path.
const enqueueMock = vi.fn().mockResolvedValue({ inserted: true, id: "queued-1" });
vi.mock("@/src/lib/scheduler/enqueue", () => ({
  enqueueExecution: (...args: unknown[]) => enqueueMock(...args),
}));

import handler from "@/src/lib/scheduler/handlers/email-sequence-step";
import type { ScheduledExecution } from "@/src/lib/scheduler/types";

// ---------------------------------------------------------------------------
// Per-table response scripts. Each entry is a `{ data, error }` object
// returned in FIFO order for that table's queries.
// ---------------------------------------------------------------------------
type Resp = { data: unknown; error: unknown | null };

interface Scripts {
  email_sequence_enrollments?: Resp[];
  audience_contacts?: Resp[];
  email_sequence_steps?: Resp[];
  profiles?: Resp[];
}

function buildSupabase(scripts: Scripts) {
  const cursors: Record<string, number> = {};
  const ops: { table: string; method: string; args: unknown[] }[] = [];

  const proxy = (table: string): unknown => {
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === "then") {
          return (onFul: (v: Resp) => unknown, onRej: (e: unknown) => unknown) => {
            const list = scripts[table as keyof Scripts] ?? [];
            const idx = cursors[table] ?? 0;
            cursors[table] = idx + 1;
            const resp = list[idx] ?? { data: null, error: null };
            return Promise.resolve(resp).then(onFul, onRej);
          };
        }
        return (...args: unknown[]) => {
          ops.push({ table, method: prop, args });
          if (prop === "single" || prop === "maybeSingle") {
            const list = scripts[table as keyof Scripts] ?? [];
            const idx = cursors[table] ?? 0;
            cursors[table] = idx + 1;
            const resp = list[idx] ?? { data: null, error: null };
            return Promise.resolve(resp);
          }
          return proxy(table);
        };
      },
    };
    return new Proxy({}, handler);
  };

  return {
    supabase: {
      from: (table: string) => proxy(table),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    ops,
  };
}

const ACTIVE_ENROLLMENT = {
  id: "enr-1",
  user_id: "user-1",
  sequence_id: "seq-1",
  contact_id: "contact-1",
  audience_id: "aud-1",
  status: "active",
  current_step_order: 0,
};

const SUBSCRIBED_CONTACT = {
  id: "contact-1",
  email: "alice@example.com",
  status: "subscribed",
  unsubscribe_token: "token-xyz",
};

const STEP_1 = {
  id: "step-1",
  sequence_id: "seq-1",
  step_order: 1,
  delay_hours: 0,
  subject_line: "Welcome",
  asset_id: "asset-1",
  assets: {
    id: "asset-1",
    title: "Welcome",
    content: { body_html: "<p>Hello {{name}}</p>" },
  },
};

function fakeExecution(): ScheduledExecution {
  return {
    id: "exec-1",
    user_id: "user-1",
    execution_type: "email_sequence_step",
    payload: { enrollmentId: ACTIVE_ENROLLMENT.id, stepOrder: 1 },
    scheduled_for: new Date().toISOString(),
    status: "running",
    attempts: 1,
    max_attempts: 3,
    last_error: null,
    idempotency_key: null,
    parent_id: ACTIVE_ENROLLMENT.id,
    parent_type: "email_sequence_enrollment",
    result: null,
    ran_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  sendMock.mockReset();
  enqueueMock.mockClear();
  enqueueMock.mockResolvedValue({ inserted: true, id: "queued-1" });
});

describe("email-sequence-step handler", () => {
  it("rejects malformed payloads as non-retryable", async () => {
    const { supabase } = buildSupabase({});
    const r = await handler({ wrong: "shape" }, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      execution: fakeExecution(),
    });
    expect(r).toEqual({
      ok: false,
      error: "Invalid payload shape",
      retryable: false,
    });
  });

  it("returns hard error when enrollment is missing", async () => {
    const { supabase } = buildSupabase({
      email_sequence_enrollments: [{ data: null, error: null }],
    });
    const r = await handler(
      { enrollmentId: "missing", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: false,
      error: "Enrollment not found",
      retryable: false,
    });
  });

  it("skips with success when enrollment is paused/cancelled", async () => {
    const { supabase } = buildSupabase({
      email_sequence_enrollments: [
        { data: { ...ACTIVE_ENROLLMENT, status: "paused" }, error: null },
      ],
    });
    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: true,
      result: { skipped: true, reason: "paused" },
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("cancels enrollment + skips when contact has unsubscribed", async () => {
    const { supabase } = buildSupabase({
      email_sequence_enrollments: [
        { data: ACTIVE_ENROLLMENT, error: null },
        { data: null, error: null }, // the cancellation update
      ],
      audience_contacts: [
        {
          data: { ...SUBSCRIBED_CONTACT, status: "unsubscribed" },
          error: null,
        },
      ],
    });
    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: true,
      result: { skipped: true, reason: "unsubscribed" },
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("hard-fails when the step's asset has no HTML body", async () => {
    const { supabase } = buildSupabase({
      email_sequence_enrollments: [{ data: ACTIVE_ENROLLMENT, error: null }],
      audience_contacts: [{ data: SUBSCRIBED_CONTACT, error: null }],
      email_sequence_steps: [
        {
          data: {
            ...STEP_1,
            assets: { id: "asset-1", title: "Step", content: {} },
          },
          error: null,
        },
      ],
    });
    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: false,
      retryable: false,
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends email and enqueues next step on success when more steps follow", async () => {
    sendMock.mockResolvedValue({ ok: true, resendEmailId: "re_abc" });

    const { supabase } = buildSupabase({
      email_sequence_enrollments: [
        { data: ACTIVE_ENROLLMENT, error: null }, // initial select
        { data: null, error: null }, // progress update
      ],
      audience_contacts: [{ data: SUBSCRIBED_CONTACT, error: null }],
      email_sequence_steps: [
        { data: STEP_1, error: null }, // current step
        { data: { step_order: 2, delay_hours: 24 }, error: null }, // next step lookup
      ],
      profiles: [
        // Profile reset_at — stale (so the handler resets the counter).
        {
          data: {
            email_usage_reset_at: new Date(
              Date.UTC(2020, 0, 1)
            ).toISOString(),
          },
          error: null,
        },
      ],
    });

    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );

    expect(r.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Welcome",
        unsubscribeToken: "token-xyz",
      })
    );
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        executionType: "email_sequence_step",
        payload: { enrollmentId: "enr-1", stepOrder: 2 },
        idempotencyKey: "seq-step:enr-1:2",
      })
    );
  });

  it("marks enrollment completed when no next step follows", async () => {
    sendMock.mockResolvedValue({ ok: true, resendEmailId: "re_xyz" });

    const { supabase, ops } = buildSupabase({
      email_sequence_enrollments: [
        { data: ACTIVE_ENROLLMENT, error: null },
        { data: null, error: null }, // progress update
        { data: null, error: null }, // completion update
      ],
      audience_contacts: [{ data: SUBSCRIBED_CONTACT, error: null }],
      email_sequence_steps: [
        { data: STEP_1, error: null },
        { data: null, error: null }, // no next step
      ],
      profiles: [
        {
          data: {
            email_usage_reset_at: new Date().toISOString(), // current month
          },
          error: null,
        },
      ],
    });

    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );

    expect(r.ok).toBe(true);
    expect(enqueueMock).not.toHaveBeenCalled();
    // The completion update should be one of the enrollment table updates.
    const enrollmentUpdates = ops.filter(
      (o) => o.table === "email_sequence_enrollments" && o.method === "update"
    );
    const hasCompletion = enrollmentUpdates.some(
      (op) =>
        typeof op.args[0] === "object" &&
        (op.args[0] as { status?: string }).status === "completed"
    );
    expect(hasCompletion).toBe(true);
  });

  it("returns retryable error when Resend send fails", async () => {
    sendMock.mockResolvedValue({ ok: false, error: "Resend timeout" });

    const { supabase } = buildSupabase({
      email_sequence_enrollments: [{ data: ACTIVE_ENROLLMENT, error: null }],
      audience_contacts: [{ data: SUBSCRIBED_CONTACT, error: null }],
      email_sequence_steps: [{ data: STEP_1, error: null }],
    });

    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );

    expect(r).toMatchObject({ ok: false, error: "Resend timeout" });
    // No retryable=false → defaults to retryable.
    expect((r as { retryable?: boolean }).retryable).not.toBe(false);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("supports the legacy content.html shape on assets", async () => {
    sendMock.mockResolvedValue({ ok: true, resendEmailId: "re_legacy" });

    const legacyStep = {
      ...STEP_1,
      assets: {
        id: "asset-1",
        title: "Legacy",
        content: { html: "<p>Legacy body</p>" }, // old POST flow
      },
    };

    const { supabase } = buildSupabase({
      email_sequence_enrollments: [
        { data: ACTIVE_ENROLLMENT, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
      audience_contacts: [{ data: SUBSCRIBED_CONTACT, error: null }],
      email_sequence_steps: [
        { data: legacyStep, error: null },
        { data: null, error: null }, // no next step
      ],
      profiles: [{ data: { email_usage_reset_at: null }, error: null }],
    });

    const r = await handler(
      { enrollmentId: "enr-1", stepOrder: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ html: "<p>Legacy body</p>" })
    );
  });
});
