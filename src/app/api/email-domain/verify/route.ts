import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyDomain } from "@/src/lib/email/marketing";
import { loadDomainRow, publicDomainView, refreshDomainRow } from "@/src/lib/email/domain-store";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// POST /api/email-domain/verify
// "Check again": asks Resend to re-check the DNS records, then reads the
// result back and stores it. The settings page polls this every 15s while
// the domain is pending.
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimit(`email-domain:verify:${user.id}`, { limit: 30, windowSeconds: 300 });
  if (!limited.allowed) return rateLimitResponse(limited);

  const row = await loadDomainRow(supabase, user.id);
  if (!row) return NextResponse.json({ error: "No sending domain yet." }, { status: 404 });

  if (row.status !== "verified") {
    // Resend returns an error when a verify is already running; the
    // follow-up getDomain still reports the latest state, so ignore it.
    await verifyDomain(row.resend_domain_id).catch(() => {});
  }

  const refreshed = await refreshDomainRow(supabase, row);
  return NextResponse.json({
    domain: publicDomainView(refreshed.row),
    stale: refreshed.stale,
    ...(refreshed.error ? { warning: "We couldn't reach the email service just now. Showing the last known state." } : {}),
  });
}
