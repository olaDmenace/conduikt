import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch metrics for this post, verifying ownership through project
  const { data: metrics, error } = await supabase
    .from("post_metrics")
    .select("*, projects!inner(user_id)")
    .eq("scheduled_post_id", postId)
    .eq("projects.user_id", user.id)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !metrics) {
    return NextResponse.json(
      { error: "Post metrics not found" },
      { status: 404 }
    );
  }

  // Strip the joined projects data before returning
  const { projects: _, ...metricsData } = metrics as Record<string, unknown>;

  return NextResponse.json(metricsData);
}
