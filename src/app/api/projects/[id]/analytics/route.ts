import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [generationsRes, auditsRes, assetsRes] = await Promise.all([
    supabase
      .from("ai_generations")
      .select("id, skill_used, input_tokens, output_tokens, model, duration_ms, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("audits")
      .select("id, type, url, score, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("assets")
      .select("id, type, channel, status, created_at")
      .eq("project_id", id),
  ]);

  return NextResponse.json({
    generations: generationsRes.data ?? [],
    audits: auditsRes.data ?? [],
    assets: assetsRes.data ?? [],
  });
}
