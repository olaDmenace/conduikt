import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { deleteAudience } from "@/src/lib/email/marketing";

// GET /api/projects/[id]/audiences/[audienceId] — single audience with stats.
export async function GET(
  _request: NextRequest,
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

  const { data: audience, error } = await supabase
    .from("audiences")
    .select(
      "id, name, description, resend_audience_id, project_id, created_at, updated_at"
    )
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .single();

  if (error || !audience) {
    return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  }

  const { count: subscribed } = await supabase
    .from("audience_contacts")
    .select("id", { count: "exact", head: true })
    .eq("audience_id", audienceId)
    .eq("status", "subscribed");

  const { count: unsubscribed } = await supabase
    .from("audience_contacts")
    .select("id", { count: "exact", head: true })
    .eq("audience_id", audienceId)
    .eq("status", "unsubscribed");

  const { count: bounced } = await supabase
    .from("audience_contacts")
    .select("id", { count: "exact", head: true })
    .eq("audience_id", audienceId)
    .eq("status", "bounced");

  return NextResponse.json({
    ...audience,
    stats: {
      subscribed: subscribed ?? 0,
      unsubscribed: unsubscribed ?? 0,
      bounced: bounced ?? 0,
    },
  });
}

// PATCH /api/projects/[id]/audiences/[audienceId] — rename / update description.
// Body: { name?: string, description?: string | null }
export async function PATCH(
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

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json(
        { error: "name must be 200 characters or fewer" },
        { status: 400 }
      );
    }
    updates.name = name;
  }
  if (body?.description !== undefined) {
    updates.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("audiences")
    .update(updates)
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .select(
      "id, name, description, resend_audience_id, project_id, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Audience not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

// DELETE /api/projects/[id]/audiences/[audienceId] — remove the audience.
// Cascades to audience_contacts via the FK ON DELETE CASCADE. Also
// removes the Resend-side audience.
export async function DELETE(
  _request: NextRequest,
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

  // Look up the resend_audience_id before deleting locally so we can
  // remove the Resend side too.
  const { data: audience } = await supabase
    .from("audiences")
    .select("resend_audience_id")
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .single();

  if (!audience) {
    return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  }

  // Best-effort: delete the Resend audience. If it fails, we still delete
  // ours — orphaned audiences in Resend are harmless and can be cleaned
  // up later. Most failures here are 'already deleted'.
  if (audience.resend_audience_id) {
    await deleteAudience(audience.resend_audience_id).catch(() => {});
  }

  const { error } = await supabase
    .from("audiences")
    .delete()
    .eq("id", audienceId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
