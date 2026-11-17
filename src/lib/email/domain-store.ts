import type { SupabaseClient } from "@supabase/supabase-js";
import { getDomain, type MarketingDomain } from "./marketing";
import { normalizeDomainStatus, normalizeRecordStatus, type DnsRecordView, type DomainStatus } from "./domain";

// DB side of the custom sending domain flow, shared by the
// /api/email-domain routes. One active domain per user.

export interface VerifiedDomainRow {
  id: string;
  user_id: string;
  domain: string;
  resend_domain_id: string;
  status: DomainStatus;
  dns_records: DnsRecordView[];
  from_local_part: string;
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DOMAIN_COLUMNS =
  "id, user_id, domain, resend_domain_id, status, dns_records, from_local_part, verified_at, last_checked_at, created_at, updated_at";

export function toRecordViews(records: MarketingDomain["records"]): DnsRecordView[] {
  return (records ?? []).map((r) => ({
    record: r.record,
    name: r.name,
    type: r.type,
    value: r.value,
    ttl: r.ttl,
    priority: r.priority,
    status: normalizeRecordStatus(r.status),
  }));
}

export async function loadDomainRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<VerifiedDomainRow | null> {
  const { data } = await supabase
    .from("verified_domains")
    .select(DOMAIN_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VerifiedDomainRow | null) ?? null;
}

/**
 * Asks Resend for the domain's current state and stores it. Returns the
 * refreshed row, or the stored row (with `stale: true`) when Resend
 * couldn't be reached.
 */
export async function refreshDomainRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  row: VerifiedDomainRow
): Promise<{ row: VerifiedDomainRow; stale: boolean; error?: string }> {
  const remote = await getDomain(row.resend_domain_id);
  if (!remote.ok) return { row, stale: true, error: remote.error };

  const status = normalizeDomainStatus(remote.data.status);
  const dns_records = toRecordViews(remote.data.records);
  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = { status, dns_records, last_checked_at: nowIso };
  if (status === "verified" && !row.verified_at) updates.verified_at = nowIso;
  if (status !== "verified") updates.verified_at = null;

  const { data } = await supabase
    .from("verified_domains")
    .update(updates)
    .eq("id", row.id)
    .select(DOMAIN_COLUMNS)
    .maybeSingle();

  return { row: (data as VerifiedDomainRow | null) ?? { ...row, ...updates } as VerifiedDomainRow, stale: false };
}

/** What the settings page renders. Never includes the Resend id. */
export function publicDomainView(row: VerifiedDomainRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    domain: row.domain,
    status: row.status,
    from_local_part: row.from_local_part,
    from_email: `${row.from_local_part}@${row.domain}`,
    dns_records: row.dns_records ?? [],
    verified_at: row.verified_at,
    last_checked_at: row.last_checked_at,
    created_at: row.created_at,
  };
}
