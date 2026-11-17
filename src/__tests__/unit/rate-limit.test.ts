// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// src/lib/security/rate-limit
//
// Three layers: the pure window math (hitWindow), the RPC row parser, and
// the async rateLimit() that prefers the shared Postgres counter and falls
// back to the per-process Map when the service role is missing or the RPC
// fails. The service client is mocked so no network is touched.
// ---------------------------------------------------------------------------

const rpcMock = vi.fn();
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

import {
  hitWindow,
  parseRateLimitRow,
  rateLimit,
  rateLimitInMemory,
  rateLimitResponse,
  resetRateLimitMemory,
  resetRateLimitWarning,
} from "@/src/lib/security/rate-limit";

const WINDOW = { limit: 3, windowSeconds: 600 };

describe("hitWindow (pure window math)", () => {
  it("starts a fresh window on the first hit", () => {
    const now = 1_000_000;
    const { entry, result } = hitWindow(undefined, WINDOW, now);
    expect(entry).toEqual({ count: 1, resetAt: now + 600_000 });
    expect(result).toEqual({ allowed: true, remaining: 2, resetAt: now + 600_000 });
  });

  it("counts up inside the window and refuses the hit past the limit", () => {
    const now = 1_000_000;
    let state = hitWindow(undefined, WINDOW, now);
    state = hitWindow(state.entry, WINDOW, now + 1);
    state = hitWindow(state.entry, WINDOW, now + 2);
    expect(state.result).toEqual({ allowed: true, remaining: 0, resetAt: now + 600_000 });

    state = hitWindow(state.entry, WINDOW, now + 3);
    expect(state.result.allowed).toBe(false);
    expect(state.result.remaining).toBe(0);
    expect(state.result.resetAt).toBe(now + 600_000);
    // The refused hit is still counted: slots taken stay taken.
    expect(state.entry.count).toBe(4);
  });

  it("resets once the window has elapsed", () => {
    const now = 1_000_000;
    const full = { count: 99, resetAt: now };
    const { entry, result } = hitWindow(full, WINDOW, now);
    expect(entry).toEqual({ count: 1, resetAt: now + 600_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("takes `cost` slots at once and refuses a batch that does not fit", () => {
    const now = 1_000_000;
    const cfg = { limit: 200, windowSeconds: 3600 };
    let state = hitWindow(undefined, { ...cfg, cost: 150 }, now);
    expect(state.result).toMatchObject({ allowed: true, remaining: 50 });

    state = hitWindow(state.entry, { ...cfg, cost: 51 }, now + 1);
    expect(state.result.allowed).toBe(false);
    expect(state.result.remaining).toBe(0);

    // A single ask after the refused batch is refused too.
    state = hitWindow(state.entry, cfg, now + 2);
    expect(state.result.allowed).toBe(false);
  });

  it("treats a cost under one as one", () => {
    const { entry } = hitWindow(undefined, { ...WINDOW, cost: 0 }, 5);
    expect(entry.count).toBe(1);
  });
});

describe("parseRateLimitRow", () => {
  const iso = "2026-11-17T10:00:00.000Z";

  it("reads the first row of a PostgREST table result", () => {
    expect(parseRateLimitRow([{ allowed: true, remaining: 4, reset_at: iso }])).toEqual({
      allowed: true,
      remaining: 4,
      resetAt: Date.parse(iso),
    });
  });

  it("tolerates a bare object and a stringy remaining", () => {
    expect(parseRateLimitRow({ allowed: false, remaining: "0", reset_at: iso })).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: Date.parse(iso),
    });
  });

  it("returns null for anything that is not a usable row", () => {
    expect(parseRateLimitRow(null)).toBeNull();
    expect(parseRateLimitRow([])).toBeNull();
    expect(parseRateLimitRow({ allowed: "yes", reset_at: iso })).toBeNull();
    expect(parseRateLimitRow({ allowed: true, remaining: 1, reset_at: "not a date" })).toBeNull();
  });
});

describe("rateLimit", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rpcMock.mockReset();
    resetRateLimitMemory();
    resetRateLimitWarning();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warn.mockRestore();
  });

  function withServiceRole() {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");
  }

  it("uses the shared counter when the RPC answers", async () => {
    withServiceRole();
    const reset_at = new Date(Date.now() + 600_000).toISOString();
    rpcMock.mockResolvedValue({ data: [{ allowed: false, remaining: 0, reset_at }], error: null });

    const result = await rateLimit("k:shared", { limit: 20, windowSeconds: 600 });

    expect(rpcMock).toHaveBeenCalledWith("rate_limit_hit", {
      p_key: "k:shared",
      p_limit: 20,
      p_window_seconds: 600,
      p_cost: 1,
    });
    expect(result).toEqual({ allowed: false, remaining: 0, resetAt: Date.parse(reset_at) });
    expect(warn).not.toHaveBeenCalled();
    // The in-memory store was not touched: a fresh in-memory hit is the first.
    expect(rateLimitInMemory("k:shared", { limit: 20, windowSeconds: 600 }).remaining).toBe(19);
  });

  it("passes the batch cost through to the RPC", async () => {
    withServiceRole();
    rpcMock.mockResolvedValue({
      data: [{ allowed: true, remaining: 150, reset_at: new Date(Date.now() + 1000).toISOString() }],
      error: null,
    });
    await rateLimit("k:batch", { limit: 200, windowSeconds: 3600, cost: 50 });
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_cost: 50 });
  });

  it("falls back to memory when the service role is not configured, and warns once", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const cfg = { limit: 2, windowSeconds: 600 };
    expect((await rateLimit("k:local", cfg)).allowed).toBe(true);
    expect((await rateLimit("k:local", cfg)).allowed).toBe(true);
    const third = await rateLimit("k:local", cfg);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);

    expect(rpcMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("falls back to memory when the RPC rejects", async () => {
    withServiceRole();
    rpcMock.mockRejectedValue(new Error("connection refused"));

    const cfg = { limit: 1, windowSeconds: 600 };
    expect((await rateLimit("k:down", cfg)).allowed).toBe(true);
    expect((await rateLimit("k:down", cfg)).allowed).toBe(false);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("connection refused");
  });

  it("falls back to memory when the RPC returns a PostgREST error", async () => {
    withServiceRole();
    rpcMock.mockResolvedValue({ data: null, error: { message: "function rate_limit_hit does not exist" } });

    const cfg = { limit: 1, windowSeconds: 600 };
    expect((await rateLimit("k:missing", cfg)).allowed).toBe(true);
    expect((await rateLimit("k:missing", cfg)).allowed).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back to memory when the RPC returns no row", async () => {
    withServiceRole();
    rpcMock.mockResolvedValue({ data: [], error: null });
    const result = await rateLimit("k:empty", { limit: 5, windowSeconds: 600 });
    expect(result).toMatchObject({ allowed: true, remaining: 4 });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("keeps separate keys separate in the fallback", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const cfg = { limit: 1, windowSeconds: 600 };
    expect((await rateLimit("a", cfg)).allowed).toBe(true);
    expect((await rateLimit("b", cfg)).allowed).toBe(true);
    expect((await rateLimit("a", cfg)).allowed).toBe(false);
  });
});

describe("rateLimitResponse", () => {
  it("is a 429 with the standard headers", async () => {
    const resetAt = Date.now() + 90_000;
    const res = rateLimitResponse({ allowed: false, remaining: 0, resetAt });
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(Math.ceil(resetAt / 1000)));
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await res.json()).toEqual({ error: "Too many requests. Please try again later." });
  });
});
