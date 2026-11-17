import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { canVerifyCustomDomain } from "@/src/lib/plans";
import { getUserPlan } from "@/src/lib/email/usage";
import { createDomain, deleteDomain, CONDUIKT_SHARED_FROM_EMAIL } from "@/src/lib/email/marketing";
import { normalizeDomain, normalizeLocalPart } from "@/src/lib/email/domain";
import {
  DOMAIN_COLUMNS,
  loadDomainRow,
  publicDomainView,
  refreshDomainRow,
  toRecordViews,
  type VerifiedDomainRow,
} from "@/src/lib/email/domain-store";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// Custom sending domain (Pro and above). One domain per user.
//
//   GET    /api/email-domain          current domain + DNS records (refreshed from Resend)
//   POST   /api/email-domain          { domain, from_local_part? }  -> creates it in Resend
//   PATCH  /api/email-domain          { from_local_part }           -> changes hello@ to e.g. news@
//   DELETE /api/email-domain          removes it (Resend + here); sends go back to the shared sender

type UserCtx =
  | { ok: false; error: NextResponse }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string } };

async function requireUser(): Promise<UserCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { ok: true, supabase, user };
}

export async function GET(): Promise<NextResponse> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.error;
  const { supabase, user } = ctx;

  const plan = await getUserPlan(supabase, user.id);
  const eligible = canVerifyCustomDomain(plan);

  let row = await loadDomainRow(supabase, user.id);
  let stale = false;
  if (row && row.status !== "verified") {
    const refreshed = await refreshDomainRow(supabase, row);
    row = refreshed.row;
    stale = refreshed.stale;
  }

  return NextResponse.json({
    plan,
    eligible,
    shared_from_email: CONDUIKT_SHARED_FROM_EMAIL,
    domain: publicDomainView(row),
    stale,
  });
}

const createSchema = z.object({
  domain: z.string().min(1).max(260),
  from_local_part: z.string().max(64).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.error;
  const { supabase, user } = ctx;

  const limited = await rateLimit(`email-domain:create:${user.id}`, { limit: 5, windowSeconds: 600 });
  if (!limited.allowed) return rateLimitResponse(limited);

  const plan = await getUserPlan(supabase, user.id);
  if (!canVerifyCustomDomain(plan)) {
    return NextResponse.json(
      { error: "Sending from your own domain is on Pro and above.", code: "PLAN_GATED" },
      { status: 403 }
    );
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type the domain you want to send from." }, { status: 400 });
  }
  const domainCheck = normalizeDomain(parsed.data.domain);
  if (!domainCheck.ok) return NextResponse.json({ error: domainCheck.error }, { status: 400 });
  const localCheck = normalizeLocalPart(parsed.data.from_local_part);
  if (!localCheck.ok) return NextResponse.json({ error: localCheck.error }, { status: 400 });

  const existing = await loadDomainRow(supabase, user.id);
  if (existing) {
    return NextResponse.json(
      { error: "You already have a sending domain. Remove it first to add a different one.", code: "DOMAIN_EXISTS" },
      { status: 409 }
    );
  }

  const created = await createDomain(domainCheck.domain);
  if (!created.ok) {
    const taken = /already|exists/i.test(created.error);
    return NextResponse.json(
      {
        error: taken
          ? "That domain is already set up with our email service. If it's yours, contact support."
          : "We couldn't add that domain right now. Try again in a minute.",
        detail: created.error,
      },
      { status: taken ? 409 : 502 }
    );
  }

  const { data, error } = await supabase
    .from("verified_domains")
    .insert({
      user_id: user.id,
      domain: domainCheck.domain,
      resend_domain_id: created.data.id,
      status: "pending",
      dns_records: toRecordViews(created.data.records),
      from_local_part: localCheck.localPart,
      last_checked_at: new Date().toISOString(),
    })
    .select(DOMAIN_COLUMNS)
    .single();

  if (error || !data) {
    // Keep Resend and our table in step: undo the Resend side.
    await deleteDomain(created.data.id).catch(() => {});
    return NextResponse.json(
      { error: error?.message ?? "Could not save the domain. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { domain: publicDomainView(data as VerifiedDomainRow), shared_from_email: CONDUIKT_SHARED_FROM_EMAIL },
    { status: 201 }
  );
}

const patchSchema = z.object({ from_local_part: z.string().max(64) });

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.error;
  const { supabase, user } = ctx;

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type the part before the @." }, { status: 400 });
  }
  const localCheck = normalizeLocalPart(parsed.data.from_local_part);
  if (!localCheck.ok) return NextResponse.json({ error: localCheck.error }, { status: 400 });

  const row = await loadDomainRow(supabase, user.id);
  if (!row) return NextResponse.json({ error: "No sending domain yet." }, { status: 404 });

  const { data, error } = await supabase
    .from("verified_domains")
    .update({ from_local_part: localCheck.localPart })
    .eq("id", row.id)
    .select(DOMAIN_COLUMNS)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ domain: publicDomainView(data as VerifiedDomainRow) });
}

export async function DELETE(): Promise<NextResponse> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.error;
  const { supabase, user } = ctx;

  const row = await loadDomainRow(supabase, user.id);
  if (!row) return NextResponse.json({ error: "No sending domain yet." }, { status: 404 });

  // Best-effort on the Resend side: a leftover domain there is harmless
  // and the user can re-add it (Resend returns the same records).
  await deleteDomain(row.resend_domain_id).catch(() => {});

  const { error } = await supabase.from("verified_domains").delete().eq("id", row.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, shared_from_email: CONDUIKT_SHARED_FROM_EMAIL });
}
