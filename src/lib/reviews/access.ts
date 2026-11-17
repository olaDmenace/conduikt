import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanAtLeast, normalizePlan, type PlanTier } from "@/src/lib/plans";

// Who may send review requests, and how many. They go out from Conduikt's
// own mailbox to addresses the owner types, so a free signup must not be
// able to use that mailbox as a relay: Free gets a small monthly taste
// (FREE_REVIEW_REQUESTS_PER_MONTH, counted across every project the user
// owns), and the Local plan, the first tier that lists review requests
// (LOCAL_PLAN_FEATURES), and everything above it have no cap.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export const REVIEW_PLAN_REQUIRED: PlanTier = "local";

/** Review requests a Free account may send per calendar month (UTC). */
export const FREE_REVIEW_REQUESTS_PER_MONTH = 5;

/** Shown once the Free allowance is used up. */
export const REVIEW_PLAN_MESSAGE = `You've used your ${FREE_REVIEW_REQUESTS_PER_MONTH} free review requests this month. Upgrade to the Local plan in Billing to ask as many customers as you like.`;

/** True on plans with no monthly cap on review requests. */
export function hasUnlimitedReviewRequests(plan: PlanTier): boolean {
  return isPlanAtLeast(plan, REVIEW_PLAN_REQUIRED);
}

/** The user's plan from profiles, or free when it cannot be read. */
export async function planOfUser(db: Db, userId: string): Promise<PlanTier> {
  try {
    const { data } = await db.from("profiles").select("plan").eq("id", userId).maybeSingle();
    return normalizePlan((data as { plan?: string | null } | null)?.plan);
  } catch {
    return "free";
  }
}

export interface ReviewAllowance {
  limit: number;
  used: number;
  remaining: number;
}

/** First instant of `now`'s calendar month, in UTC. */
export function monthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Review requests this user has sent this month, across every project
 * they own. Every attempt is a row, so failed and skipped ones count too:
 * the cap is on asks made, not on asks that landed.
 */
export async function reviewRequestsUsedThisMonth(db: Db, userId: string, now: Date = new Date()): Promise<number> {
  const { data: projects } = await db.from("projects").select("id").eq("user_id", userId);
  const ids = ((projects ?? []) as Array<{ id: string }>).map((p) => p.id);
  if (ids.length === 0) return 0;
  const { count } = await db
    .from("review_requests")
    .select("id", { count: "exact", head: true })
    .in("project_id", ids)
    .gte("created_at", monthStartUtc(now).toISOString());
  return count ?? 0;
}

/**
 * How many review requests this user may still send this month, or null
 * on a plan with no cap.
 */
export async function reviewAllowance(db: Db, userId: string, plan: PlanTier, now: Date = new Date()): Promise<ReviewAllowance | null> {
  if (hasUnlimitedReviewRequests(plan)) return null;
  const used = await reviewRequestsUsedThisMonth(db, userId, now);
  const limit = FREE_REVIEW_REQUESTS_PER_MONTH;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

/** The message for a Free user asking for `wanted` customers with `allowance` left. */
export function reviewAllowanceMessage(allowance: ReviewAllowance, wanted: number): string {
  if (allowance.remaining <= 0) return REVIEW_PLAN_MESSAGE;
  const left = allowance.remaining === 1 ? "1 free review request" : `${allowance.remaining} free review requests`;
  return `You have ${left} left this month and this would send ${wanted}. Send fewer, or upgrade to the Local plan in Billing for no monthly cap.`;
}
