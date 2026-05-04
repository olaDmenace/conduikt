import { describe, it, expect, beforeEach, vi } from "vitest";
import { dispatchDueExecutions } from "@/src/lib/scheduler/dispatcher";
import {
  registerHandler,
  _resetHandlersForTesting,
} from "@/src/lib/scheduler/registry";

// ---------------------------------------------------------------------------
// Fake Supabase: a Proxy that records every method call and returns canned
// responses in FIFO order at any terminal (`.then()`, `.single()`,
// `.maybeSingle()`). Lets us drive the dispatcher through realistic chains
// without modeling Postgrest's full builder.
// ---------------------------------------------------------------------------

type CannedResp = { data: unknown; error: { code?: string; message: string } | null };
type Op = { table: string; method: string; args: unknown[] };

function makeFakeSupabase(canned: CannedResp[]) {
  const ops: Op[] = [];
  let cursor = 0;

  const buildProxy = (table: string): unknown => {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === "then") {
          // await on the chain — consume the next canned response.
          return (onFul: (v: CannedResp) => unknown, onRej: (e: unknown) => unknown) => {
            const resp = canned[cursor++] ?? { data: null, error: null };
            return Promise.resolve(resp).then(onFul, onRej);
          };
        }
        return (...args: unknown[]) => {
          ops.push({ table, method: prop, args });
          if (prop === "single" || prop === "maybeSingle") {
            const resp = canned[cursor++] ?? { data: null, error: null };
            return Promise.resolve(resp);
          }
          return proxy;
        };
      },
    };
    const proxy = new Proxy({}, handler);
    return proxy;
  };

  const supabase = {
    from: (table: string) => buildProxy(table),
  };

  return { supabase, ops, getCursor: () => cursor };
}

beforeEach(() => {
  _resetHandlersForTesting();
});

const baseRow = {
  id: "row-1",
  user_id: "user-1",
  execution_type: "test_handler",
  payload: { foo: "bar" },
  scheduled_for: new Date(Date.now() - 60_000).toISOString(),
  status: "pending",
  attempts: 0,
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
};

describe("dispatchDueExecutions", () => {
  it("returns empty result when no rows are due", async () => {
    const { supabase } = makeFakeSupabase([{ data: [], error: null }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r).toEqual({
      scanned: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      unhandled: 0,
    });
  });

  it("dispatches one due row to its handler on success", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true, result: { sent: 1 } });
    registerHandler("test_handler", handler);

    const claimed = { ...baseRow, status: "running", attempts: 1 };
    const { supabase, ops } = makeFakeSupabase([
      { data: [baseRow], error: null }, // pull due
      { data: claimed, error: null }, // claim update
      { data: null, error: null }, // mark completed
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r).toEqual({
      scanned: 1,
      completed: 1,
      failed: 0,
      retried: 0,
      unhandled: 0,
    });
    expect(handler).toHaveBeenCalledWith(
      baseRow.payload,
      expect.objectContaining({ execution: claimed })
    );
    // Last update should be the completed-write.
    const lastUpdate = ops.findLast((o) => o.method === "update");
    expect(lastUpdate?.args[0]).toMatchObject({
      status: "completed",
      result: { sent: 1 },
      last_error: null,
    });
  });

  it("retries with backoff when handler returns retryable failure", async () => {
    registerHandler("test_handler", async () => ({
      ok: false,
      error: "transient network",
    }));

    const claimed = { ...baseRow, attempts: 1 };
    const { supabase, ops } = makeFakeSupabase([
      { data: [baseRow], error: null },
      { data: claimed, error: null },
      { data: null, error: null }, // pending re-queue
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r.retried).toBe(1);
    expect(r.failed).toBe(0);
    const reQueue = ops.findLast((o) => o.method === "update");
    expect(reQueue?.args[0]).toMatchObject({
      status: "pending",
      last_error: "transient network",
    });
  });

  it("hard-fails when handler signals retryable=false", async () => {
    registerHandler("test_handler", async () => ({
      ok: false,
      error: "audience deleted",
      retryable: false,
    }));

    const claimed = { ...baseRow, attempts: 1 };
    const { supabase, ops } = makeFakeSupabase([
      { data: [baseRow], error: null },
      { data: claimed, error: null },
      { data: null, error: null },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r.failed).toBe(1);
    expect(r.retried).toBe(0);
    const finalUpdate = ops.findLast((o) => o.method === "update");
    expect(finalUpdate?.args[0]).toMatchObject({
      status: "failed",
      last_error: "audience deleted",
    });
  });

  it("hard-fails after max_attempts is reached", async () => {
    registerHandler("test_handler", async () => ({
      ok: false,
      error: "still flaky",
    }));

    // attempts=3 (hits max) so the post-claim row also reflects attempts=3.
    const exhausted = { ...baseRow, attempts: 3, max_attempts: 3 };
    const { supabase, ops } = makeFakeSupabase([
      { data: [exhausted], error: null },
      { data: { ...exhausted, attempts: 3 }, error: null },
      { data: null, error: null },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r.failed).toBe(1);
    const finalUpdate = ops.findLast((o) => o.method === "update");
    expect(finalUpdate?.args[0]).toMatchObject({ status: "failed" });
  });

  it("counts unhandled types and reverts the row to pending", async () => {
    // No handler registered for this type.
    const { supabase, ops } = makeFakeSupabase([
      { data: [{ ...baseRow, execution_type: "ghost_type" }], error: null },
      { data: { ...baseRow, execution_type: "ghost_type", attempts: 1 }, error: null },
      { data: null, error: null },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r.unhandled).toBe(1);
    expect(r.completed).toBe(0);
    const revert = ops.findLast((o) => o.method === "update");
    expect(revert?.args[0]).toMatchObject({
      status: "pending",
      attempts: 0, // reverted from the claim's attempts=1 back to original
    });
    expect(revert?.args[0]).toHaveProperty("last_error");
  });

  it("skips silently when a row was claimed by another tick", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    registerHandler("test_handler", handler);

    const { supabase } = makeFakeSupabase([
      { data: [baseRow], error: null },
      { data: null, error: null }, // claim returned no row (race lost)
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r.scanned).toBe(1);
    expect(r.completed).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("treats a handler that throws as a retryable failure", async () => {
    registerHandler("test_handler", async () => {
      throw new Error("kapow");
    });

    const claimed = { ...baseRow, attempts: 1 };
    const { supabase, ops } = makeFakeSupabase([
      { data: [baseRow], error: null },
      { data: claimed, error: null },
      { data: null, error: null },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await dispatchDueExecutions(supabase as any);
    expect(r.retried).toBe(1);
    const reQueue = ops.findLast((o) => o.method === "update");
    expect(reQueue?.args[0]).toMatchObject({
      status: "pending",
      last_error: "kapow",
    });
  });
});
