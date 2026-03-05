import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { pollHeyGenVideo } from "@/src/lib/integrations/heygen";

export async function GET(
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

  const { data: job, error } = await supabase
    .from("video_jobs")
    .select(
      "status, progress_message, video_url, thumbnail_url, error_message, provider, provider_job_id, duration_seconds, script_data"
    )
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If generating and we have a provider job ID, poll HeyGen for live updates
  if (
    job.status === "generating_video" &&
    job.provider === "heygen" &&
    job.provider_job_id
  ) {
    try {
      const heygenStatus = await pollHeyGenVideo(job.provider_job_id);
      if (heygenStatus.status === "completed" && heygenStatus.videoUrl) {
        // Inngest will handle the download + storage — just report progress
        return NextResponse.json({
          status: job.status,
          progressMessage:
            "Almost done — finalising your video...",
          videoUrl: null,
          thumbnailUrl: job.thumbnail_url,
          error: null,
        });
      }
    } catch {
      // Non-critical — return current DB state
    }
  }

  return NextResponse.json({
    status: job.status,
    progressMessage: job.progress_message,
    videoUrl: job.video_url,
    thumbnailUrl: job.thumbnail_url,
    durationSeconds: job.duration_seconds,
    scriptData: job.script_data,
    error: job.error_message,
  });
}
