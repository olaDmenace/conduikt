import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

// POST /api/projects/[id]/schedule
// Body: { assetId, channel, scheduledFor, postText }
// Creates a row in scheduled_posts for the cron job to pick up.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { assetId, channel, scheduledFor, postText } = body as {
    assetId: string;
    channel: "x" | "linkedin";
    scheduledFor: string;
    postText: string;
  };

  if (!assetId || !channel || !scheduledFor || !postText) {
    return NextResponse.json(
      { error: "assetId, channel, scheduledFor, and postText are required" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return NextResponse.json(
      { error: "scheduledFor must be a future datetime" },
      { status: 400 }
    );
  }

  // Merge scheduled_text into the asset's content blob so the cron job can retrieve it
  const { data: asset } = await supabase
    .from("assets")
    .select("content")
    .eq("id", assetId)
    .single();

  if (asset) {
    await supabase
      .from("assets")
      .update({
        content: { ...(asset.content as object), scheduled_text: postText },
      })
      .eq("id", assetId);
  }

  const { data: scheduled, error } = await supabase
    .from("scheduled_posts")
    .insert({
      asset_id: assetId,
      project_id: projectId,
      channel,
      scheduled_for: scheduledDate.toISOString(),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(scheduled, { status: 201 });
}

// GET /api/projects/[id]/schedule — list scheduled posts for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select(`
      id,
      channel,
      scheduled_for,
      posted_at,
      status,
      error_message,
      created_at,
      assets (id, title, type, content)
    `)
    .eq("project_id", projectId)
    .order("scheduled_for", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
