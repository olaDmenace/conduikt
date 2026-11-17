import { rateLimit, type RateLimitResult } from "@/src/lib/security/rate-limit";

// Review requests leave from Conduikt's shared mailbox, so the cap that
// matters is how many customers one account may contact in an hour, not
// how many times it calls the route: one paste can carry 50 rows.

/** Calls to the route per user per hour. */
export const REVIEW_REQUESTS_PER_HOUR = 20;
/** Customers contacted per user per hour, across every paste and single ask. */
export const REVIEW_ROWS_PER_HOUR = 200;
export const REVIEW_WINDOW_SECONDS = 3600;

type Config = { limit: number; windowSeconds: number };

/**
 * Take `count` slots from one window at once. Slots taken before a refusal
 * stay taken, which is the point: a paste that does not fit cannot be
 * split into ones that do.
 */
export function takeRateLimit(key: string, config: Config, count: number): Promise<RateLimitResult> {
  return rateLimit(key, { ...config, cost: Math.max(1, count) });
}
