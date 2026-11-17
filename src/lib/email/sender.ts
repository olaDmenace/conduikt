// Which address an email goes out from.
//
// Every marketing send (one-off emails, email series steps, the double
// opt-in confirmation) asks this module. A user on Pro or above with a
// verified sending domain sends from <local part>@<their domain>; everyone
// else sends from Conduikt's shared sender with their own display name.

import type { SupabaseClient } from "@supabase/supabase-js";
import { canVerifyCustomDomain } from "@/src/lib/plans";
import { CONDUIKT_SHARED_FROM_EMAIL } from "./marketing";
import { getUserPlan } from "./usage";

export interface VerifiedSender {
  domain: string;
  from_local_part: string | null;
  status: string;
}

export interface SenderAddress {
  /** Bare address, e.g. hello@example.com */
  email: string;
  /** RFC 5322 form, e.g. "Acme <hello@example.com>" */
  from: string;
  /** True when the address is on the user's own verified domain. */
  custom: boolean;
}

// Display names go inside quotes; strip anything that would break the
// header or let the name smuggle in a second address.
function cleanDisplayName(name: string | null | undefined): string {
  const cleaned = (name ?? "").replace(/[\r\n<>"]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Conduikt";
}

export function formatFrom(displayName: string | null | undefined, email: string): string {
  return `${cleanDisplayName(displayName)} <${email}>`;
}

/**
 * Pure selection: given the user's verified domain row (if any), decide
 * the from address. Only a row with status 'verified' wins; pending or
 * failed domains fall back to the shared sender.
 */
export function pickSenderAddress(
  verified: VerifiedSender | null | undefined,
  displayName: string | null | undefined,
  sharedEmail: string = CONDUIKT_SHARED_FROM_EMAIL
): SenderAddress {
  if (verified && verified.status === "verified" && verified.domain) {
    const local = (verified.from_local_part ?? "").trim() || "hello";
    const email = `${local}@${verified.domain}`;
    return { email, from: formatFrom(displayName, email), custom: true };
  }
  return { email: sharedEmail, from: formatFrom(displayName, sharedEmail), custom: false };
}

/**
 * Looks up the user's plan and verified domain and returns the address to
 * send from. The domain only counts while the plan still allows it: a user
 * who verified on Pro and then dropped to Free goes back to the shared
 * sender (the row stays so they can see and remove it, or upgrade again).
 * Works with either the session client (RLS) or the service client.
 */
export async function resolveSenderAddress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  displayName: string | null | undefined
): Promise<SenderAddress> {
  const [plan, { data }] = await Promise.all([
    getUserPlan(supabase, userId),
    supabase
      .from("verified_domains")
      .select("domain, from_local_part, status")
      .eq("user_id", userId)
      .eq("status", "verified")
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!canVerifyCustomDomain(plan)) return pickSenderAddress(null, displayName);
  return pickSenderAddress((data as VerifiedSender | null) ?? null, displayName);
}
