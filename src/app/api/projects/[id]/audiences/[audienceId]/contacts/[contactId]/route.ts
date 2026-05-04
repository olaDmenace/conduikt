import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { removeContact, updateContactStatus } from "@/src/lib/email/marketing";

// PATCH /api/projects/[id]/audiences/[audienceId]/contacts/[contactId]
// Body: { status?, first_name?, last_name?, custom_fields? }
// Most common use: toggle subscribed/unsubscribed.
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
      "id, audience_id, resend_contact_id, status, audiences!inner(id, project_id, resend_audience_id)"
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

  if (body?.status === "subscribed" || body?.status === "unsubscribed") {
    updates.status = body.status;
    if (body.status === "unsubscribed") updates.unsubscribed_at = new Date().toISOString();
    else if (body.status === "subscribed") updates.unsubscribed_at = null;
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

  // Mirror status flips in Resend (best-effort).
  if (
    updates.status &&
    audience.resend_audience_id &&
    contact.resend_contact_id
  ) {
    await updateContactStatus(
      audience.resend_audience_id,
      contact.resend_contact_id,
      updates.status === "unsubscribed"
    ).catch(() => {});
  }

  const { data, error } = await supabase
    .from("audience_contacts")
    .update(updates)
    .eq("id", contactId)
    .eq("audience_id", audienceId)
    .select("id, email, first_name, last_name, status, custom_fields, subscribed_at, unsubscribed_at")
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
