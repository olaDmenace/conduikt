import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { inngest } from "@/src/lib/inngest/client";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// POST /api/video/[jobId]/retry
// Re-runs the existing failed job through the Inngest pipeline. We reuse
// the same row (and therefore the existing script_data) so the user
// doesn't have to re-enter the brief — they just consent to spending a
// fresh generation credit.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`video-gen:${user.id}`, { limit: 3, windowSeconds: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { data: job } = await supabase
    .from("video_jobs")
    .select("id, status, user_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed jobs can be retried" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generation_count")
    .eq("id", user.id)
    .single();

  if (!["growth", "agency"].includes(profile?.plan ?? "free")) {
    return NextResponse.json(
      {
        error: "Video Ad generation is available on Growth and Agency plans.",
        upgradeUrl: "/settings/billing",
      },
      { status: 402 }
    );
  }

  // Reset job state for the new run. Keep brief/script_data/style/avatar
  // settings so the retry uses the same inputs.
  const { error: updateError } = await supabase
    .from("video_jobs")
    .update({
      status: "scripting",
      progress_message: "Retrying video generation...",
      error_message: null,
      video_url: null,
      thumbnail_url: null,
      duration_seconds: null,
      provider_job_id: null,
      completed_at: null,
    })
    .eq("id", jobId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to reset job for retry" },
      { status: 500 }
    );
  }

  // Charge a fresh credit. The original attempt was refunded when it
  // failed, so this brings the user back to "1 credit per video".
  await supabase
    .from("profiles")
    .update({ generation_count: (profile?.generation_count ?? 0) + 1 })
    .eq("id", user.id);

  await inngest.send({
    name: "video/job.created",
    data: { jobId },
  });

  return NextResponse.json({ success: true, jobId });
}
