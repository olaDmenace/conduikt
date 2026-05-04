import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { createContact } from "@/src/lib/email/marketing";
import { checkContactsLimit, getUserPlan } from "@/src/lib/email/usage";
import { parseContactsCsv } from "@/src/lib/email/csv-parse";

// POST /api/projects/[id]/audiences/[audienceId]/contacts/import
// Body: { csv: string }   — raw CSV text. Required column: email.
//                          Optional: first_name, last_name. Anything else
//                          becomes a custom field.
//
// Behavior on plan limit:
//   - Total contacts in audience would exceed limit → import only up to
//     the cap and report the partial-success in the response. The caller
//     decides whether to upgrade and re-import the rest.
//
// Returns:
//   {
//     imported: number,    // newly inserted in this call
//     skipped: number,     // duplicates (already in audience)
//     failed: number,      // CSV parse errors + DB errors
//     truncated: boolean,  // true if plan limit cut the import short
//     totalRows: number,   // total CSV rows attempted (excludes header)
//     errors: [{ row, message }],
//   }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; audienceId: string }> }
) {
  const { id: projectId, audienceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: audience } = await supabase
    .from("audiences")
    .select("id, resend_audience_id")
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .single();
  if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "csv body field is required" }, { status: 400 });
  }
  if (csv.length > 5_000_000) {
    // 5MB cap — keeps inline import fast. Larger lists should be chunked
    // client-side or moved to a background job in V2.
    return NextResponse.json(
      { error: "CSV too large (max 5MB). Split into chunks or contact support." },
      { status: 413 }
    );
  }

  const parsed = parseContactsCsv(csv);
  if (parsed.contacts.length === 0) {
    return NextResponse.json(
      {
        error:
          parsed.errors[0]?.message ?? "No valid contacts found in CSV.",
        errors: parsed.errors,
        totalRows: parsed.totalRows,
      },
      { status: 400 }
    );
  }

  // Plan-gating: how many contacts can we still add without exceeding the cap?
  const plan = await getUserPlan(supabase, user.id);
  const usage = await checkContactsLimit(supabase, audienceId, plan, parsed.contacts.length);

  let toInsert = parsed.contacts;
  let truncated = false;
  if (!usage.ok) {
    if (usage.remaining === 0) {
      return NextResponse.json(
        {
          error: `Contact limit reached (${usage.used}/${usage.limit} on your plan). Upgrade to import more.`,
          code: "PLAN_GATED",
          limits: usage,
        },
        { status: 403 }
      );
    }
    toInsert = parsed.contacts.slice(0, usage.remaining);
    truncated = true;
  }

  // Pull existing emails in this audience to dedup before insert. Cheaper
  // than relying on the unique-constraint failures (one per duplicate).
  const { data: existing } = await supabase
    .from("audience_contacts")
    .select("email")
    .eq("audience_id", audienceId);
  const existingEmails = new Set((existing ?? []).map((r) => r.email.toLowerCase()));

  const fresh = toInsert.filter((c) => !existingEmails.has(c.email));
  const skipped = toInsert.length - fresh.length;

  if (fresh.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped,
      failed: parsed.errors.length,
      truncated,
      totalRows: parsed.totalRows,
      errors: parsed.errors,
    });
  }

  // Mirror in Resend best-effort. We don't block Conduikt insert on Resend
  // success — contacts without a resend_contact_id can be back-filled later.
  const resendIds = new Map<string, string>();
  if (audience.resend_audience_id) {
    // Sequential to avoid hammering Resend. CSVs are usually <1k contacts.
    for (const c of fresh) {
      const r = await createContact(audience.resend_audience_id, {
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
      });
      if (r.ok) resendIds.set(c.email, r.data.id);
    }
  }

  // Bulk insert — Postgres handles dedup via the unique constraint, but we
  // already filtered, so this should not throw on dup.
  const rows = fresh.map((c) => ({
    audience_id: audienceId,
    email: c.email,
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    custom_fields: c.custom_fields,
    resend_contact_id: resendIds.get(c.email) ?? null,
    status: "subscribed",
  }));

  const { data: inserted, error } = await supabase
    .from("audience_contacts")
    .insert(rows)
    .select("id");

  if (error) {
    return NextResponse.json(
      {
        error: `Database insert failed: ${error.message}`,
        imported: 0,
        skipped,
        failed: parsed.errors.length + fresh.length,
        truncated,
        totalRows: parsed.totalRows,
        errors: parsed.errors,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    imported: inserted?.length ?? 0,
    skipped,
    failed: parsed.errors.length,
    truncated,
    totalRows: parsed.totalRows,
    errors: parsed.errors,
  });
}
