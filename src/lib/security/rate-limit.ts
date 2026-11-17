/**
 * Fixed-window rate limiter shared across lambdas.
 *
 * Counters live in Postgres (public.rate_limits, bumped atomically by the
 * rate_limit_hit() RPC in supabase/migrations/20261117_rate_limits.sql), so
 * every Vercel instance sees the same count. When the service role is not
 * configured (local dev, tests) or the RPC fails, the limiter falls back to
 * a per-process Map so the route still has *some* cap instead of none. The
 * fallback is announced once per process.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";

export interface RateLimitConfig {
  /** Max slots allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /**
   * Slots this hit takes (default 1). A paste of 50 customers takes 50 at
   * once; slots taken before a refusal stay taken.
   */
  cost?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch milliseconds when the window resets */
  resetAt: number;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// Pure window math (exported for tests). Given the stored entry for a key,
// returns the entry after this hit and the verdict. Mirrors the SQL exactly:
// an expired window starts over at `cost`, otherwise the count is bumped and
// the hit is allowed while count <= limit.
// ---------------------------------------------------------------------------
export function hitWindow(
  entry: RateLimitEntry | undefined,
  config: RateLimitConfig,
  now: number = Date.now()
): { entry: RateLimitEntry; result: RateLimitResult } {
  const cost = Math.max(1, Math.floor(config.cost ?? 1));
  const windowMs = Math.max(1, config.windowSeconds) * 1000;

  const next: RateLimitEntry =
    !entry || now >= entry.resetAt
      ? { count: cost, resetAt: now + windowMs }
      : { count: entry.count + cost, resetAt: entry.resetAt };

  return {
    entry: next,
    result: {
      allowed: next.count <= config.limit,
      remaining: Math.max(0, config.limit - next.count),
      resetAt: next.resetAt,
    },
  };
}

/**
 * Shape the RPC hands back (PostgREST returns a `returns table` function as
 * an array of rows; a single object is tolerated too). Exported for tests.
 * Returns null when the payload is not a usable row.
 */
export function parseRateLimitRow(data: unknown): RateLimitResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as { allowed?: unknown; remaining?: unknown; reset_at?: unknown };
  if (typeof r.allowed !== "boolean") return null;
  const resetAt = typeof r.reset_at === "string" ? Date.parse(r.reset_at) : NaN;
  if (!Number.isFinite(resetAt)) return null;
  const remaining = typeof r.remaining === "number" ? r.remaining : Number(r.remaining);
  return {
    allowed: r.allowed,
    remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : 0,
    resetAt,
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically to prevent memory leaks. unref so a
// test runner or one-off script is not kept alive by the timer.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 60_000);
if (typeof sweeper === "object" && sweeper && "unref" in sweeper) sweeper.unref();

/** Per-process limiter. Exported for tests and for callers that must not await. */
export function rateLimitInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const { entry, result } = hitWindow(store.get(key), config);
  store.set(key, entry);
  return result;
}

/** Test hook: forget every in-memory counter. */
export function resetRateLimitMemory(): void {
  store.clear();
}

// ---------------------------------------------------------------------------
// Shared (Postgres) limiter
// ---------------------------------------------------------------------------
function hasServiceRole(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let warned = false;
function warnFallbackOnce(reason: string, err?: unknown): void {
  if (warned) return;
  warned = true;
  const detail = err instanceof Error ? ` (${err.message})` : err ? ` (${String(err)})` : "";
  console.warn(`[rate-limit] ${reason}${detail}; using the per-instance in-memory limiter`);
}

/** Test hook: let the next fallback log again. */
export function resetRateLimitWarning(): void {
  warned = false;
}

type ServiceClient = ReturnType<typeof createServiceClient>;
let client: ServiceClient | null = null;
function serviceClient(): ServiceClient {
  if (!client) client = createServiceClient();
  return client;
}

/**
 * Take a slot from the window for `key`. Shared across instances through
 * Postgres; falls back to the in-memory limiter when the RPC is unavailable.
 */
export async function rateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (!hasServiceRole()) {
    warnFallbackOnce("SUPABASE_SERVICE_ROLE_KEY is not set");
    return rateLimitInMemory(key, config);
  }

  try {
    const { data, error } = await serviceClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds,
      p_cost: Math.max(1, Math.floor(config.cost ?? 1)),
    });
    if (error) throw error;
    const result = parseRateLimitRow(data);
    if (!result) throw new Error("rate_limit_hit returned no row");
    return result;
  } catch (err) {
    warnFallbackOnce("rate_limit_hit RPC failed", err);
    return rateLimitInMemory(key, config);
  }
}

/**
 * Helper to return a 429 response with rate limit headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    }
  );
}
