import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownedProject = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: trackers } = await supabase
    .from("competitor_trackers")
    .select(
      `
      *,
      competitor_snapshots(id, keyword_overlap, content_gaps, estimated_da, top_keywords, created_at)
    `
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ trackers: trackers ?? [] });
}

export async function POST(
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

  const ownedProject2 = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { competitor_url, competitor_name } = body;

  if (!competitor_url) {
    return NextResponse.json(
      { error: "Competitor URL is required" },
      { status: 400 }
    );
  }

  // Check plan limits (5 for growth, unlimited for agency)
  const { count } = await supabase
    .from("competitor_trackers")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const limit = plan === "agency" ? 999 : 5;

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `You can track up to ${limit} competitors on your plan` },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("competitor_trackers")
    .insert({
      project_id: id,
      competitor_url,
      competitor_name: competitor_name || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
