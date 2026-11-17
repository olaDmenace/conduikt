import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { updateContactStatus } from "@/src/lib/email/marketing";
import { HARD_SUPPRESSED, parseSuppressionList } from "@/src/lib/email/suppression";

// POST /api/projects/[id]/audiences/[audienceId]/contacts/suppress
// Body: { list: string }   one email per line, or comma / space separated.
//
// Marks every listed address suppressed in this list. Addresses already on
// the list flip to 'suppressed' (bounced / complained stay as they are);
// addresses not on the list are inserted as 'suppressed' so a later CSV
// import or form sign-up can't bring them in live (both skip existing
// emails).
//
// Returns { suppressed, inserted, unchanged, invalid: string[] }.

const bodySchema = z.object({ list: z.string().min(1).max(1_000_000) });

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

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Paste at least one email address." }, { status: 400 });
  }

  const { emails, invalid } = parseSuppressionList(parsed.data.list);
  if (emails.length === 0) {
    return NextResponse.json(
      { error: "No valid email addresses found.", invalid },
      { status: 400 }
    );
  }

  const { data: existingRows, error: readErr } = await supabase
    .from("audience_contacts")
    .select("id, email, status, resend_contact_id")
    .eq("audience_id", audienceId)
    .in("email", emails);
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const existing = existingRows ?? [];
  const existingByEmail = new Map(existing.map((r) => [r.email.toLowerCase(), r]));
  const nowIso = new Date().toISOString();

  // Flip existing rows that aren't already hard-suppressed.
  const toFlip = existing.filter((r) => !HARD_SUPPRESSED.has(r.status) && r.status !== "suppressed");
  let suppressed = 0;
  if (toFlip.length > 0) {
    const { error: upErr } = await supabase
      .from("audience_contacts")
      .update({
        status: "suppressed",
        suppression_reason: "manual",
        unsubscribed_at: nowIso,
        confirm_token: null,
        pending_sequence_id: null,
      })
      .in(
        "id",
        toFlip.map((r) => r.id)
      );
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    suppressed = toFlip.length;

    // Stop any email series in flight for them.
    await supabase
      .from("email_sequence_enrollments")
      .update({ status: "cancelled", cancellation_reason: "suppressed" })
      .in(
        "contact_id",
        toFlip.map((r) => r.id)
      )
      .eq("status", "active");

    // Resend side, best-effort and sequential (lists are small).
    if (audience.resend_audience_id) {
      for (const r of toFlip) {
        if (r.resend_contact_id) {
          await updateContactStatus(audience.resend_audience_id, r.resend_contact_id, true).catch(() => {});
        }
      }
    }
  }

  // Insert the rest as suppressed so they can never be imported live.
  const fresh = emails.filter((e) => !existingByEmail.has(e));
  let inserted = 0;
  if (fresh.length > 0) {
    const rows = fresh.map((email) => ({
      audience_id: audienceId,
      email,
      status: "suppressed",
      suppression_reason: "manual",
      unsubscribed_at: nowIso,
    }));
    const { data: ins, error: insErr } = await supabase
      .from("audience_contacts")
      .insert(rows)
      .select("id");
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    inserted = ins?.length ?? 0;
  }

  return NextResponse.json({
    suppressed,
    inserted,
    unchanged: existing.length - toFlip.length,
    invalid,
    total: emails.length,
  });
}
