import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user owns the project associated with this scheduled post
  const { data: scheduledPost } = await supabase
    .from("scheduled_posts")
    .select("project_id")
    .eq("id", id)
    .single();

  if (!scheduledPost) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownedProject = await verifyProjectOwnership(supabase, scheduledPost.project_id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.scheduled_for) {
    updates.scheduled_for = body.scheduled_for;
  }

  // Media updates are persisted on the linked asset's content blob
  if (body.media !== undefined) {
    const { data: scheduled } = await supabase
      .from("scheduled_posts")
      .select("asset_id")
      .eq("id", id)
      .single();

    if (scheduled?.asset_id) {
      const { data: asset } = await supabase
        .from("assets")
        .select("content")
        .eq("id", scheduled.asset_id)
        .single();

      const prevContent = (asset?.content as Record<string, unknown>) ?? {};
      await supabase
        .from("assets")
        .update({ content: { ...prevContent, media: body.media } })
        .eq("id", scheduled.asset_id);
    }
  }

  if (Object.keys(updates).length === 0 && body.media === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from("scheduled_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ ok: true });
}
