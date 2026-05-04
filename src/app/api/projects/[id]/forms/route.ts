import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

// GET /api/projects/[id]/forms — list forms for this project.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("lead_forms")
    .select(
      "id, name, headline, audience_id, sequence_id, redirect_url, submit_label, thank_you_message, is_active, submission_count, created_at, audiences ( id, name ), email_sequences ( id, name )"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/projects/[id]/forms — create a form.
// Body: { name, audience_id, sequence_id?, headline?, submit_label?,
//         thank_you_message?, redirect_url? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    audience_id?: string;
    sequence_id?: string | null;
    headline?: string;
    submit_label?: string;
    thank_you_message?: string;
    redirect_url?: string;
  };

  if (!body.name || !body.audience_id) {
    return NextResponse.json(
      { error: "name and audience_id are required" },
      { status: 400 }
    );
  }

  // Verify the audience belongs to this project.
  const { data: audience } = await supabase
    .from("audiences")
    .select("id, project_id")
    .eq("id", body.audience_id)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!audience) {
    return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  }

  // If a sequence_id was passed, verify it too — orphan refs are
  // allowed by FK (ON DELETE SET NULL), but at create time we want a
  // clean error.
  if (body.sequence_id) {
    const { data: seq } = await supabase
      .from("email_sequences")
      .select("id, project_id")
      .eq("id", body.sequence_id)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!seq) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }
  }

  const { data, error } = await supabase
    .from("lead_forms")
    .insert({
      project_id: projectId,
      user_id: user.id,
      audience_id: body.audience_id,
      sequence_id: body.sequence_id ?? null,
      name: body.name,
      headline: body.headline ?? null,
      submit_label: body.submit_label || "Subscribe",
      thank_you_message:
        body.thank_you_message ||
        "Thanks for subscribing! Check your inbox.",
      redirect_url: body.redirect_url ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create form" },
      { status: 500 }
    );
  }
  return NextResponse.json(data, { status: 201 });
}
