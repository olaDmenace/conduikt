import { createServiceClient } from "@/src/lib/supabase/service";
import { createHeyGenVideo, pollHeyGenVideo, resolveUGCAvatar } from "@/src/lib/integrations/heygen";
import type { BrandMatchContext } from "@/src/lib/integrations/heygen";
import { searchUnsplash } from "@/src/lib/integrations/unsplash";
import { createNotification } from "@/src/lib/notifications";

async function updateJob(
  jobId: string,
  updates: Record<string, unknown>
) {
  const supabase = createServiceClient();
  await supabase.from("video_jobs").update(updates).eq("id", jobId);
}

/**
 * Runs the full video pipeline for a given job ID.
 * HeyGen handles both the avatar presenter and TTS voice internally,
 * so we skip the separate ElevenLabs voiceover step.
 */
export async function runVideoPipeline(jobId: string) {
  let jobUserId: string | null = null;
  let jobProjectId: string | null = null;
  let jobBrief: string | null = null;
  try {
    // Step 1: Fetch job
    const supabase = createServiceClient();
    const { data: job } = await supabase
      .from("video_jobs")
      .select("*, projects(name, website_url)")
      .eq("id", jobId)
      .single();

    if (!job) throw new Error("Job not found");
    jobUserId = job.user_id as string;
    jobProjectId = job.project_id as string;
    jobBrief = job.brief as string;

    const scriptData = job.script_data as {
      voiceover_script?: string;
      script?: string;
      style?: string;
    } | null;
    const voiceoverText =
      scriptData?.voiceover_script || scriptData?.script || job.brief;

    // Step 2: Fetch thumbnail from Unsplash
    let thumbnailUrl: string | null = null;
    try {
      const projectName =
        (job.projects as { name: string } | null)?.name ?? "marketing";
      const result = await searchUnsplash(`${projectName} marketing technology`, {
        perPage: 1,
        orientation: "landscape",
      });
      thumbnailUrl = result.results[0]?.urls?.regular ?? null;
      if (thumbnailUrl) {
        await updateJob(jobId, { thumbnail_url: thumbnailUrl });
      }
    } catch {
      // Thumbnail is optional — continue without it
    }

    // Step 3: Submit to HeyGen (handles TTS + avatar internally)
    await updateJob(jobId, {
      status: "generating_video",
      progress_message: "AI is recording your presenter...",
    });

    const videoType = (job.style as "presenter" | "cinematic" | "ugc") || "presenter";

    // Resolve avatar for UGC videos
    let avatarId: string | undefined;
    let resolvedVoiceId: string | undefined;
    if (videoType === "ugc") {
      const avatarMode = (job.avatar_mode as "random" | "pick" | "brand-matched") || "random";
      const projectData = job.projects as { name: string; website_url?: string } | null;
      const projectContext: BrandMatchContext | undefined = avatarMode === "brand-matched" && projectData
        ? {
            projectName: projectData.name,
            industry: (job as Record<string, unknown>).industry as string | undefined,
            targetAudience: (job as Record<string, unknown>).target_audience as string | undefined,
          }
        : undefined;

      const resolved = await resolveUGCAvatar(avatarMode, {
        gender: (job.avatar_gender as "male" | "female") || undefined,
        selectedAvatarId: (job.selected_avatar_id as string) || undefined,
        projectContext,
      });
      avatarId = resolved.avatarId;

      // Match voice gender to avatar gender
      if (resolved.gender === "male") {
        resolvedVoiceId = process.env.HEYGEN_DEFAULT_VOICE_ID_MALE ?? process.env.HEYGEN_DEFAULT_VOICE_ID;
      } else if (resolved.gender === "female") {
        resolvedVoiceId = process.env.HEYGEN_DEFAULT_VOICE_ID;
      }
      // "unknown" → let HeyGen use default

    }

    const { jobId: hgJobId } = await createHeyGenVideo({
      script: voiceoverText,
      backgroundUrl: videoType === "ugc" ? undefined : (thumbnailUrl ?? undefined),
      backgroundStyle: videoType === "ugc" ? "natural" : "studio",
      videoType,
      avatarId,
      voiceId: resolvedVoiceId,
    });

    await updateJob(jobId, {
      provider: "heygen",
      provider_job_id: hgJobId,
    });

    // Step 4: Poll HeyGen until done (up to 10 minutes)
    const MAX_POLLS = 60;
    const POLL_INTERVAL_MS = 10_000;
    let videoUrl: string | null = null;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const result = await pollHeyGenVideo(hgJobId);

      if (result.status === "completed" && result.videoUrl) {
        const videoRes = await fetch(result.videoUrl);
        if (!videoRes.ok) throw new Error("Failed to download video from HeyGen");
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

        const videoPath = `${jobId}/final.mp4`;
        const { error: vidErr } = await supabase.storage
          .from("videos")
          .upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (vidErr) throw new Error(`Video upload failed: ${vidErr.message}`);

        const {
          data: { publicUrl },
        } = supabase.storage.from("videos").getPublicUrl(videoPath);

        videoUrl = publicUrl;

        await updateJob(jobId, {
          duration_seconds: result.duration ?? null,
        });

        break;
      }

      if (result.status === "failed") {
        const errDetail = typeof result.error === "string"
          ? result.error
          : result.error ? JSON.stringify(result.error) : "HeyGen video generation failed";
        throw new Error(errDetail);
      }

      const elapsed = Math.round(((i + 1) * POLL_INTERVAL_MS) / 1000);
      await updateJob(jobId, {
        progress_message: `AI is recording your presenter... (${elapsed}s elapsed)`,
      });
    }

    if (!videoUrl) {
      throw new Error("HeyGen generation timed out after 10 minutes");
    }

    // Step 5: Finalise
    await updateJob(jobId, {
      status: "ready",
      video_url: videoUrl,
      progress_message: "Your video is ready!",
      completed_at: new Date().toISOString(),
    });

    // Notify user
    if (jobUserId) {
      await createNotification(jobUserId, {
        type: "video_complete",
        title: "Your video is ready",
        body: `Video ad "${(jobBrief ?? "").slice(0, 60)}" has finished generating.`,
        projectId: jobProjectId ?? undefined,
        actionUrl: `/projects/${jobProjectId}/video`,
      });
    }
  } catch (err) {
    console.error(`[video-pipeline] Job ${jobId} failed:`, err);
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === "string") {
      errorMessage = err;
    } else {
      try {
        errorMessage = JSON.stringify(err);
      } catch {
        errorMessage = String(err);
      }
    }
    await updateJob(jobId, {
      status: "failed",
      error_message: errorMessage,
      progress_message: "Video generation failed",
    });

    // Notify user of failure
    if (jobUserId) {
      await createNotification(jobUserId, {
        type: "video_failed",
        title: "Video generation failed",
        body: errorMessage.slice(0, 200),
        projectId: jobProjectId ?? undefined,
        actionUrl: `/projects/${jobProjectId}/video`,
      });
    }
  }
}
