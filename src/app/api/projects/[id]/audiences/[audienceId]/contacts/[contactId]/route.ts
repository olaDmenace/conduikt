import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { createContact, removeContact, updateContactStatus } from "@/src/lib/email/marketing";
import { HARD_SUPPRESSED } from "@/src/lib/email/suppression";

// PATCH /api/projects/[id]/audiences/[audienceId]/contacts/[contactId]
// Body: { status?, first_name?, last_name?, custom_fields? }
//
// status flips:
//   'unsubscribed'  owner unsubscribes them
//   'suppressed'    owner suppresses them (suppression_reason 'manual');
//                   never sent to again until the owner unsuppresses
//   'subscribed'    unsubscribe / unsuppress. Not allowed from 'bounced' or
//                   'complained': those come from the mailbox provider and
//                   re-sending would hurt the sender's reputation. A pending
//                   contact marked subscribed counts as confirmed by the
//                   owner (confirmed_at is set). Contacts that were never
//                   mirrored to Resend (pending sign-ups, pasted suppression
//                   rows) are added to the Resend audience here so one-off
//                   emails reach them.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; audienceId: string; contactId: string }> }
) {
  const { id: projectId, audienceId, contactId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Confirm audience belongs to project, contact belongs to audience.
  const { data: contact } = await supabase
    .from("audience_contacts")
    .select(
      "id, audience_id, email, first_name, last_name, resend_contact_id, status, audiences!inner(id, project_id, resend_audience_id)"
    )
    .eq("id", contactId)
    .eq("audience_id", audienceId)
    .single();

  const audience = Array.isArray(contact?.audiences) ? contact.audiences[0] : contact?.audiences;
  if (!contact || !audience || audience.project_id !== projectId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  const nowIso = new Date().toISOString();

  if (body?.status === "subscribed" || body?.status === "unsubscribed" || body?.status === "suppressed") {
    if (body.status === "subscribed" && HARD_SUPPRESSED.has(contact.status)) {
      return NextResponse.json(
        {
          error:
            contact.status === "complained"
              ? "This person marked an email as spam. They can't be re-subscribed from here."
              : "Emails to this address bounced. It can't be re-subscribed from here.",
          code: "HARD_SUPPRESSED",
        },
        { status: 409 }
      );
    }
    updates.status = body.status;
    if (body.status === "unsubscribed") {
      updates.unsubscribed_at = nowIso;
      updates.suppression_reason = "manual";
    } else if (body.status === "suppressed") {
      updates.unsubscribed_at = nowIso;
      updates.suppression_reason = "manual";
    } else {
      updates.unsubscribed_at = null;
      updates.suppression_reason = null;
      updates.pending_sequence_id = null;
      // A pending contact the owner marks subscribed counts as confirmed by the owner.
      if (contact.status === "pending") {
        updates.confirmed_at = nowIso;
        updates.subscribed_at = nowIso;
      }
    }
  }
  if (typeof body?.first_name === "string" || body?.first_name === null) {
    updates.first_name = body.first_name?.trim?.() || null;
  }
  if (typeof body?.last_name === "string" || body?.last_name === null) {
    updates.last_name = body.last_name?.trim?.() || null;
  }
  if (body?.custom_fields && typeof body.custom_fields === "object") {
    updates.custom_fields = body.custom_fields;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Mirror status flips in Resend (best-effort). Suppressed and
  // unsubscribed both mean "don't send" on the Resend side. A contact
  // that was never mirrored (pending sign-up, pasted suppression row) is
  // created in the Resend audience the first time they become subscribed.
  if (updates.status && audience.resend_audience_id) {
    if (contact.resend_contact_id) {
      await updateContactStatus(
        audience.resend_audience_id,
        contact.resend_contact_id,
        updates.status !== "subscribed"
      ).catch(() => {});
    } else if (updates.status === "subscribed" && contact.email) {
      const firstName = typeof updates.first_name === "string" ? updates.first_name : contact.first_name;
      const lastName = typeof updates.last_name === "string" ? updates.last_name : contact.last_name;
      const mirrored = await createContact(audience.resend_audience_id, {
        email: contact.email,
        first_name: firstName ?? undefined,
        last_name: lastName ?? undefined,
      }).catch(() => null);
      if (mirrored?.ok) updates.resend_contact_id = mirrored.data.id;
    }
  }

  const { data, error } = await supabase
    .from("audience_contacts")
    .update(updates)
    .eq("id", contactId)
    .eq("audience_id", audienceId)
    .select(
      "id, email, first_name, last_name, status, custom_fields, subscribed_at, unsubscribed_at, suppression_reason, confirmed_at, resend_contact_id"
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/projects/[id]/audiences/[audienceId]/contacts/[contactId]
// Hard delete from both Conduikt and Resend.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; audienceId: string; contactId: string }> }
) {
  const { id: projectId, audienceId, contactId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: contact } = await supabase
    .from("audience_contacts")
    .select(
      "id, resend_contact_id, audiences!inner(id, project_id, resend_audience_id)"
    )
    .eq("id", contactId)
    .eq("audience_id", audienceId)
    .single();

  const audience = Array.isArray(contact?.audiences) ? contact.audiences[0] : contact?.audiences;
  if (!contact || !audience || audience.project_id !== projectId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (audience.resend_audience_id && contact.resend_contact_id) {
    await removeContact(audience.resend_audience_id, contact.resend_contact_id).catch(() => {});
  }

  const { error } = await supabase
    .from("audience_contacts")
    .delete()
    .eq("id", contactId)
    .eq("audience_id", audienceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
