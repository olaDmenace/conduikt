import { inngest } from "../client";
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
  const { error } = await supabase
    .from("video_jobs")
    .update(updates)
    .eq("id", jobId);
  if (error) {
    throw new Error(
      `updateJob(${jobId}) failed: ${error.message} [${error.code ?? "unknown"}]`
    );
  }
}

/**
 * Durable video pipeline. HeyGen handles both the avatar presenter and the TTS
 * voice internally, so we do NOT call ElevenLabs here. Each poll is its own
 * Inngest step so the function survives serverless time limits.
 */
export const videoPipeline = inngest.createFunction(
  { id: "video-pipeline", retries: 2 },
  { event: "video/job.created" },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string };

    let jobUserId: string | null = null;
    let jobProjectId: string | null = null;
    let jobBrief: string | null = null;

    try {
      // Step 1: Fetch job
      const job = await step.run("fetch-job", async () => {
        const supabase = createServiceClient();
        const { data } = await supabase
          .from("video_jobs")
          .select("*, projects(name, website_url)")
          .eq("id", jobId)
          .single();

        if (!data) throw new Error("Job not found");
        return data;
      });

      jobUserId = job.user_id as string;
      jobProjectId = job.project_id as string;
      jobBrief = job.brief as string;

      const scriptData = job.script_data as {
        voiceover_script?: string;
        script?: string;
      } | null;
      const voiceoverText =
        scriptData?.voiceover_script || scriptData?.script || job.brief;

      // Step 2: Fetch thumbnail (optional)
      const thumbnailUrl = await step.run("fetch-thumbnail", async () => {
        try {
          const projectName =
            (job.projects as { name: string } | null)?.name ?? "marketing";
          const result = await searchUnsplash(`${projectName} marketing technology`, {
            perPage: 1,
            orientation: "landscape",
          });
          const url = result.results[0]?.urls?.regular ?? null;
          if (url) {
            await updateJob(jobId, { thumbnail_url: url });
          }
          return url;
        } catch {
          return null;
        }
      });

      // Step 3: Submit to HeyGen
      const heygenJobId = await step.run("submit-heygen", async () => {
        await updateJob(jobId, {
          status: "generating_video",
          progress_message: "AI is recording your presenter...",
        });

        const videoType = (job.style as "presenter" | "cinematic" | "ugc") || "presenter";

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

          // Resolve voice based on avatar gender. Unknown-gender avatars are
          // filtered upstream, but we still default to the female voice as a
          // last resort rather than letting HeyGen's default pick silently.
          if (resolved.gender === "male") {
            resolvedVoiceId = process.env.HEYGEN_DEFAULT_VOICE_ID_MALE ?? process.env.HEYGEN_DEFAULT_VOICE_ID;
          } else {
            resolvedVoiceId = process.env.HEYGEN_DEFAULT_VOICE_ID;
          }

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

        return hgJobId;
      });

      // Step 4: Poll HeyGen — each iteration is its own durable step
      const MAX_POLLS = 60;
      const POLL_INTERVAL = "10s";
      let videoUrl: string | null = null;
      let durationSeconds: number | null = null;

      for (let i = 0; i < MAX_POLLS; i++) {
        await step.sleep(`poll-wait-${i}`, POLL_INTERVAL);

        const pollResult = await step.run(`poll-heygen-${i}`, async () => {
          const result = await pollHeyGenVideo(heygenJobId);

          if (result.status !== "completed" && result.status !== "failed") {
            const elapsed = (i + 1) * 10;
            await updateJob(jobId, {
              progress_message: `AI is recording your presenter... (${elapsed}s elapsed)`,
            });
          }

          return {
            status: result.status,
            videoUrl: result.videoUrl ?? null,
            duration: result.duration ?? null,
            error: result.error ?? null,
          };
        });

        if (pollResult.status === "failed") {
          const errDetail = typeof pollResult.error === "string"
            ? pollResult.error
            : pollResult.error ? JSON.stringify(pollResult.error) : "HeyGen video generation failed";
          throw new Error(errDetail);
        }

        if (pollResult.status === "completed" && pollResult.videoUrl) {
          // Step 5: Download from HeyGen and re-upload to Supabase
          videoUrl = await step.run("download-and-store", async () => {
            const videoRes = await fetch(pollResult.videoUrl!);
            if (!videoRes.ok) throw new Error("Failed to download video from HeyGen");
            const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

            const supabase = createServiceClient();
            const path = `${jobId}/final.mp4`;
            const { error: upErr } = await supabase.storage
              .from("videos")
              .upload(path, videoBuffer, {
                contentType: "video/mp4",
                upsert: true,
              });
            if (upErr) throw new Error(`Video upload failed: ${upErr.message}`);

            const {
              data: { publicUrl },
            } = supabase.storage.from("videos").getPublicUrl(path);

            return publicUrl;
          });
          durationSeconds = pollResult.duration;
          break;
        }
      }

      if (!videoUrl) {
        throw new Error("HeyGen generation timed out after 10 minutes");
      }

      // Step 6: Finalise — mark job ready. This must succeed.
      await step.run("mark-ready", async () => {
        await updateJob(jobId, {
          status: "ready",
          video_url: videoUrl,
          duration_seconds: durationSeconds,
          progress_message: "Your video is ready!",
          completed_at: new Date().toISOString(),
        });
      });

      // Step 7: Notify — independent of status update. If this throws, the
      // job is already marked ready; we just lose the notification.
      if (jobUserId) {
        await step.run("notify-user", async () => {
          try {
            await createNotification(jobUserId!, {
              type: "video_complete",
              title: "Your video is ready",
              body: `Video ad "${(jobBrief ?? "").slice(0, 60)}" has finished generating.`,
              projectId: jobProjectId ?? undefined,
              actionUrl: `/projects/${jobProjectId}/video`,
            });
          } catch (notifyErr) {
            console.warn(
              `[video-pipeline] ${jobId}: notification failed:`,
              notifyErr
            );
            // Swallow — don't fail the run for a notification issue.
          }
        });
      }

      return { jobId, videoUrl };
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

      if (jobUserId) {
        await createNotification(jobUserId, {
          type: "video_failed",
          title: "Video generation failed",
          body: errorMessage.slice(0, 200),
          projectId: jobProjectId ?? undefined,
          actionUrl: `/projects/${jobProjectId}/video`,
        });
      }

      throw err;
    }
  }
);
