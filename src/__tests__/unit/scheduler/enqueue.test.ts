import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueExecution } from "@/src/lib/scheduler/enqueue";

// Bespoke tiny supabase mock — the shared helper's chain is too coarse for
// the two-path enqueue logic (insert OR insert-then-fallback-select).

interface MockResponse {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

function buildSupabase(opts: {
  insert?: MockResponse;
  selectByKey?: MockResponse;
}) {
  const insertResp =
    opts.insert ?? { data: { id: "new-id" }, error: null };
  const selectResp =
    opts.selectByKey ?? { data: null, error: null };

  const tableMock = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(insertResp),
    maybeSingle: vi.fn().mockResolvedValue(selectResp),
  };
  return {
    from: vi.fn().mockReturnValue(tableMock),
    _table: tableMock,
  };
}

describe("enqueueExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a row with no idempotency key", async () => {
    const supabase = buildSupabase({
      insert: { data: { id: "abc-123" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await enqueueExecution(supabase as any, {
      userId: "u1",
      executionType: "test_type",
      payload: { hello: "world" },
    });
    expect(res).toEqual({ inserted: true, id: "abc-123" });
    expect(supabase.from).toHaveBeenCalledWith("scheduled_executions");
  });

  it("defaults scheduledFor to now-ish", async () => {
    const supabase = buildSupabase({
      insert: { data: { id: "x" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await enqueueExecution(supabase as any, {
      userId: "u1",
      executionType: "test_type",
    });
    const insertedRow = supabase._table.insert.mock.calls[0][0] as {
      scheduled_for: string;
    };
    const delta = Math.abs(
      new Date(insertedRow.scheduled_for).getTime() - Date.now()
    );
    expect(delta).toBeLessThan(5_000);
  });

  it("inserts with idempotency key on first call", async () => {
    const supabase = buildSupabase({
      insert: { data: { id: "fresh-1" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await enqueueExecution(supabase as any, {
      userId: "u1",
      executionType: "test_type",
      idempotencyKey: "step-42",
    });
    expect(res).toEqual({ inserted: true, id: "fresh-1" });
  });

  it("falls back to select when idempotency key conflicts (23505)", async () => {
    const supabase = buildSupabase({
      insert: { data: null, error: { code: "23505", message: "dup" } },
      selectByKey: { data: { id: "existing-1" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await enqueueExecution(supabase as any, {
      userId: "u1",
      executionType: "test_type",
      idempotencyKey: "already-there",
    });
    expect(res).toEqual({ inserted: false, id: "existing-1" });
    expect(supabase._table.maybeSingle).toHaveBeenCalled();
  });

  it("throws when insert fails for non-conflict reason", async () => {
    const supabase = buildSupabase({
      insert: { data: null, error: { code: "42P01", message: "no such table" } },
    });
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      enqueueExecution(supabase as any, {
        userId: "u1",
        executionType: "test_type",
        idempotencyKey: "x",
      })
    ).rejects.toThrow(/no such table/);
  });

  it("passes parent and maxAttempts through to row", async () => {
    const supabase = buildSupabase({
      insert: { data: { id: "ok" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await enqueueExecution(supabase as any, {
      userId: "u1",
      executionType: "playbook_action",
      parentId: "enrollment-9",
      parentType: "playbook_run",
      maxAttempts: 5,
    });
    const insertedRow = supabase._table.insert.mock.calls[0][0] as {
      parent_id: string;
      parent_type: string;
      max_attempts: number;
    };
    expect(insertedRow.parent_id).toBe("enrollment-9");
    expect(insertedRow.parent_type).toBe("playbook_run");
    expect(insertedRow.max_attempts).toBe(5);
  });
});
