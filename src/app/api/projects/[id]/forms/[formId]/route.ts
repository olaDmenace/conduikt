import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

// PATCH /api/projects/[id]/forms/[formId]
// Body: any subset of editable fields (name, headline, submit_label,
//       thank_you_message, redirect_url, sequence_id, is_active).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: projectId, formId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = [
    "name",
    "headline",
    "submit_label",
    "thank_you_message",
    "redirect_url",
    "sequence_id",
    "is_active",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("lead_forms")
    .update(update)
    .eq("id", formId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update form" },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}

// DELETE /api/projects/[id]/forms/[formId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: projectId, formId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("lead_forms")
    .delete()
    .eq("id", formId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
