import { describe, it, expect, beforeEach } from "vitest";

import handler from "@/src/lib/scheduler/handlers/playbook-action";
import type { ScheduledExecution } from "@/src/lib/scheduler/types";

// Per-table response scripts. Same pattern as the email-sequence-step
// tests — Proxy-based fake supabase that hands out canned responses by
// table name in FIFO order.
type Resp = { data: unknown; error: { code?: string; message?: string } | null };

interface Scripts {
  assets?: Resp[];
  projects?: Resp[];
  connected_accounts?: Resp[];
  scheduled_posts?: Resp[];
}

function buildSupabase(scripts: Scripts) {
  const cursors: Record<string, number> = {};
  const ops: { table: string; method: string; args: unknown[] }[] = [];
  const proxy = (table: string): unknown => {
    const h: ProxyHandler<object> = {
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
    return new Proxy({}, h);
  };
  return { supabase: { from: (t: string) => proxy(t) }, ops };
}

const ACTIVE_ASSET = {
  id: "asset-1",
  project_id: "project-1",
  status: "draft",
  content: { scheduled_text: "Hello world from the playbook." },
};

function fakeExecution(): ScheduledExecution {
  return {
    id: "exec-1",
    user_id: "user-1",
    execution_type: "playbook_action",
    payload: {
      assetId: "asset-1",
      projectId: "project-1",
      channel: "x",
    },
    scheduled_for: new Date().toISOString(),
    status: "running",
    attempts: 1,
    max_attempts: 3,
    last_error: null,
    idempotency_key: null,
    parent_id: "asset-1",
    parent_type: "playbook_action",
    result: null,
    ran_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  // No mocks to reset — handler is pure given supabase.
});

describe("playbook-action handler", () => {
  it("rejects malformed payloads as non-retryable", async () => {
    const { supabase } = buildSupabase({});
    const r = await handler(
      { wrong: "shape" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: false,
      error: "Invalid payload shape",
      retryable: false,
    });
  });

  it("hard-fails when the asset has been deleted", async () => {
    const { supabase } = buildSupabase({
      assets: [{ data: null, error: null }],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({ ok: false, retryable: false });
  });

  it("succeeds with skip when asset is already published", async () => {
    const { supabase } = buildSupabase({
      assets: [
        { data: { ...ACTIVE_ASSET, status: "published" }, error: null },
      ],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: true,
      result: { skipped: true, reason: "already_published" },
    });
  });

  it("hard-fails when payload's projectId mismatches asset's", async () => {
    const { supabase } = buildSupabase({
      assets: [
        { data: { ...ACTIVE_ASSET, project_id: "different" }, error: null },
      ],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({ ok: false, retryable: false });
  });

  it("hard-fails when asset has no scheduled_text or raw content", async () => {
    const { supabase } = buildSupabase({
      assets: [{ data: { ...ACTIVE_ASSET, content: {} }, error: null }],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({ ok: false, retryable: false });
  });

  it("hard-fails when there's no connected account for the channel", async () => {
    const { supabase } = buildSupabase({
      assets: [{ data: ACTIVE_ASSET, error: null }],
      projects: [{ data: { user_id: "user-1" }, error: null }],
      connected_accounts: [{ data: null, error: null }],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({ ok: false, retryable: false });
    expect((r as { error?: string }).error).toMatch(/connected x account/i);
  });

  it("inserts a scheduled_post and returns its id on success", async () => {
    const { supabase, ops } = buildSupabase({
      assets: [{ data: ACTIVE_ASSET, error: null }],
      projects: [{ data: { user_id: "user-1" }, error: null }],
      connected_accounts: [{ data: { id: "acc-1" }, error: null }],
      scheduled_posts: [{ data: { id: "scheduled-1" }, error: null }],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r).toMatchObject({
      ok: true,
      result: { scheduled_post_id: "scheduled-1", channel: "x" },
    });
    // The insert should have happened on scheduled_posts.
    const inserted = ops.find(
      (o) => o.table === "scheduled_posts" && o.method === "insert"
    );
    expect(inserted).toBeTruthy();
    expect(inserted?.args[0]).toMatchObject({
      asset_id: "asset-1",
      project_id: "project-1",
      channel: "x",
      status: "pending",
    });
  });

  it("falls back to content.raw when scheduled_text is absent", async () => {
    const { supabase, ops } = buildSupabase({
      assets: [
        {
          data: { ...ACTIVE_ASSET, content: { raw: "Raw fallback text" } },
          error: null,
        },
      ],
      projects: [{ data: { user_id: "user-1" }, error: null }],
      connected_accounts: [{ data: { id: "acc-1" }, error: null }],
      scheduled_posts: [{ data: { id: "scheduled-2" }, error: null }],
    });
    const r = await handler(
      { assetId: "asset-1", projectId: "project-1", channel: "linkedin" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: supabase as any, execution: fakeExecution() }
    );
    expect(r.ok).toBe(true);
    const inserted = ops.find(
      (o) => o.table === "scheduled_posts" && o.method === "insert"
    );
    expect(inserted?.args[0]).toMatchObject({ channel: "linkedin" });
  });
});
