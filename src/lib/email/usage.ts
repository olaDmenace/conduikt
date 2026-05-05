// Plan-gating helpers for the email marketing flows.
//
// Three things to check at gating time:
//   1. Audience count (max audiences/user) — checked at audience CREATE
//   2. Contacts in an audience — checked at contact CREATE / CSV import
//   3. Emails sent this month — checked at broadcast SEND
//
// All three return { ok, used, limit } so the caller can either fail
// gracefully or write a partial-success response (e.g., import 30 of 50
// contacts up to the limit).

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmailLimits, isUnlimited, normalizePlan, type PlanTier } from "@/src/lib/plans";

export interface UsageCheck {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanTier> {
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  return normalizePlan(data?.plan);
}

export async function checkAudienceLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanTier
): Promise<UsageCheck> {
  const limit = getEmailLimits(plan).audiences;
  const { count } = await supabase
    .from("audiences")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const used = count ?? 0;
  if (isUnlimited(limit)) return { ok: true, used, limit, remaining: Infinity };
  return { ok: used < limit, used, limit, remaining: Math.max(0, limit - used) };
}

export async function checkContactsLimit(
  supabase: SupabaseClient,
  audienceId: string,
  plan: PlanTier,
  adding = 1
): Promise<UsageCheck> {
  const limit = getEmailLimits(plan).contactsPerAudience;
  const { count } = await supabase
    .from("audience_contacts")
    .select("id", { count: "exact", head: true })
    .eq("audience_id", audienceId);
  const used = count ?? 0;
  if (isUnlimited(limit)) return { ok: true, used, limit, remaining: Infinity };
  const wouldBe = used + adding;
  return { ok: wouldBe <= limit, used, limit, remaining: Math.max(0, limit - used) };
}

// Caps how many email_sequences a user can have at once. Sequences are
// counted across ALL the user's projects (not per-project) because the
// limit's purpose is plan-tier differentiation, not per-project scope.
export async function checkSequenceLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanTier
): Promise<UsageCheck> {
  const limit = getEmailLimits(plan).sequences;
  // email_sequences has project_id but no user_id column — join through
  // projects to scope by user.
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) {
    return { ok: true, used: 0, limit, remaining: isUnlimited(limit) ? Infinity : limit };
  }
  const { count } = await supabase
    .from("email_sequences")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds);
  const used = count ?? 0;
  if (isUnlimited(limit)) return { ok: true, used, limit, remaining: Infinity };
  return { ok: used < limit, used, limit, remaining: Math.max(0, limit - used) };
}

export async function checkEmailsPerMonthLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanTier,
  adding = 1
): Promise<UsageCheck> {
  const limit = getEmailLimits(plan).emailsPerMonth;
  // Reset on the first send of a new calendar month. We track via a
  // reset_at column on profiles so the increment is cheap and atomic.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_usage_count, email_usage_reset_at")
    .eq("id", userId)
    .single();

  const now = new Date();
  const resetAt = profile?.email_usage_reset_at ? new Date(profile.email_usage_reset_at) : null;
  const inCurrentMonth =
    resetAt &&
    resetAt.getUTCFullYear() === now.getUTCFullYear() &&
    resetAt.getUTCMonth() === now.getUTCMonth();

  const used = inCurrentMonth ? (profile?.email_usage_count ?? 0) : 0;
  if (isUnlimited(limit)) return { ok: true, used, limit, remaining: Infinity };
  const wouldBe = used + adding;
  return { ok: wouldBe <= limit, used, limit, remaining: Math.max(0, limit - used) };
}
