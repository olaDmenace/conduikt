import { describe, it, expect, beforeEach, vi } from "vitest";

const connMock = vi.fn();
const sendTextMock = vi.fn();
const sendTemplateMock = vi.fn();
const recordMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/src/lib/integrations/whatsapp", () => ({
  getWhatsAppConnection: (...args: unknown[]) => connMock(...args),
  sendTextMessage: (...args: unknown[]) => sendTextMock(...args),
  sendTemplateMessage: (...args: unknown[]) => sendTemplateMock(...args),
  recordWhatsAppEvent: (...args: unknown[]) => recordMock(...args),
  normalisePhone: (p: string | null) => (p ? p.replace(/\D/g, "") : null),
  WHATSAPP_NOT_CONNECTED_MESSAGE: "Connect WhatsApp first.",
}));

const enqueueMock = vi.fn().mockResolvedValue({ inserted: true, id: "queued-1" });
vi.mock("@/src/lib/scheduler/enqueue", () => ({
  enqueueExecution: (...args: unknown[]) => enqueueMock(...args),
}));

import handler from "@/src/lib/scheduler/handlers/whatsapp-step";
import type { ScheduledExecution } from "@/src/lib/scheduler/types";

type Resp = { data: unknown; error: unknown | null };
interface Scripts {
  email_sequence_enrollments?: Resp[];
  audience_contacts?: Resp[];
  email_sequence_steps?: Resp[];
  audiences?: Resp[];
}

// Same per-table FIFO script proxy as the email-sequence-step tests.
function buildSupabase(scripts: Scripts) {
  const cursors: Record<string, number> = {};
  const ops: { table: string; method: string; args: unknown[] }[] = [];
  const next = (table: string): Resp => {
    const list = scripts[table as keyof Scripts] ?? [];
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
            return (onFul: (v: Resp) => unknown, onRej: (e: unknown) => unknown) => Promise.resolve(next(table)).then(onFul, onRej);
          }
          return (...args: unknown[]) => {
            ops.push({ table, method: prop, args });
            if (prop === "single" || prop === "maybeSingle") return Promise.resolve(next(table));
            return proxy(table);
          };
        },
      }
    );
  return { supabase: { from: (table: string) => proxy(table), rpc: vi.fn() }, ops };
}

const ENROLLMENT = { id: "enr-1", user_id: "user-1", sequence_id: "seq-1", contact_id: "contact-1", audience_id: "aud-1", status: "active", current_step_order: 1 };
const CONTACT = { id: "contact-1", phone: "+234 800 000 0000", whatsapp_opt_in: true, status: "subscribed", first_name: "Ada" };
const STEP = { id: "step-2", sequence_id: "seq-1", step_order: 2, delay_hours: 0, channel: "whatsapp", asset_id: "asset-2", assets: { id: "asset-2", content: { body_text: "Hi Ada" }, title: "Hi" } };
const NEXT_STEP = { step_order: 3, delay_hours: 24, channel: "email" };
const execution = { id: "exec-1", attempts: 0 } as unknown as ScheduledExecution;

function scripts(): Scripts {
  return {
    email_sequence_enrollments: [{ data: ENROLLMENT, error: null }],
    audience_contacts: [{ data: CONTACT, error: null }],
    email_sequence_steps: [{ data: STEP, error: null }, { data: NEXT_STEP, error: null }],
    audiences: [{ data: { project_id: "proj-1" }, error: null }],
  };
}

function updatesTo(ops: { table: string; method: string; args: unknown[] }[], table: string) {
  return ops.filter((o) => o.table === table && o.method === "update").map((o) => o.args[0] as Record<string, unknown>);
}

beforeEach(() => {
  connMock.mockReset();
  sendTextMock.mockReset();
  sendTemplateMock.mockReset();
  recordMock.mockClear();
  enqueueMock.mockClear();
});

describe("whatsapp_step handler", () => {
  it("skips the step and continues the sequence when WhatsApp is not connected", async () => {
    connMock.mockResolvedValue(null);
    const { supabase, ops } = buildSupabase(scripts());
    const res = await handler({ enrollmentId: "enr-1", stepOrder: 2 }, { execution, supabase: supabase as never });

    expect(res.ok).toBe(true);
    expect((res as { result?: unknown }).result).toMatchObject({ skipped: true, reason: "whatsapp_not_connected", next_step_order: 3 });
    expect(sendTextMock).not.toHaveBeenCalled();
    expect(recordMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventType: "failed", metadata: { step_order: 2, reason: "whatsapp_not_connected" } }));
    expect(updatesTo(ops, "email_sequence_enrollments")[0]).toMatchObject({ current_step_order: 2 });
    expect(enqueueMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ executionType: "email_sequence_step", payload: { enrollmentId: "enr-1", stepOrder: 3 } }));
  });

  it("skips the step on a permanent Meta error instead of stranding the enrollment", async () => {
    connMock.mockResolvedValue({ phoneNumberId: "pn-1", accessToken: "t" });
    sendTextMock.mockResolvedValue({ ok: false, error: "Outside the 24 hour window", code: 131047 });
    const { supabase, ops } = buildSupabase(scripts());
    const res = await handler({ enrollmentId: "enr-1", stepOrder: 2 }, { execution, supabase: supabase as never });

    expect(res.ok).toBe(true);
    expect((res as { result?: unknown }).result).toMatchObject({ skipped: true, reason: "send_failed", code: 131047, next_step_order: 3 });
    expect(recordMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventType: "failed" }));
    expect(updatesTo(ops, "email_sequence_enrollments")[0]).toMatchObject({ current_step_order: 2 });
    expect(enqueueMock).toHaveBeenCalledTimes(1);
  });

  it("retries transient send errors without advancing", async () => {
    connMock.mockResolvedValue({ phoneNumberId: "pn-1", accessToken: "t" });
    sendTextMock.mockResolvedValue({ ok: false, error: "503 from Meta", code: 503 });
    const { supabase, ops } = buildSupabase(scripts());
    const res = await handler({ enrollmentId: "enr-1", stepOrder: 2 }, { execution, supabase: supabase as never });

    expect(res.ok).toBe(false);
    expect((res as { retryable?: boolean }).retryable).toBe(true);
    expect(updatesTo(ops, "email_sequence_enrollments")).toHaveLength(0);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("sends, records and enqueues the next step on success", async () => {
    connMock.mockResolvedValue({ phoneNumberId: "pn-1", accessToken: "t" });
    sendTextMock.mockResolvedValue({ ok: true, messageId: "wamid.1" });
    const { supabase } = buildSupabase(scripts());
    const res = await handler({ enrollmentId: "enr-1", stepOrder: 2 }, { execution, supabase: supabase as never });

    expect(res.ok).toBe(true);
    expect((res as { result?: unknown }).result).toMatchObject({ wa_message_id: "wamid.1", step_order: 2, next_step_order: 3 });
    expect(sendTextMock).toHaveBeenCalledWith(expect.anything(), { to: "2348000000000", body: "Hi Ada" });
    expect(recordMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventType: "sent" }));
  });
});
