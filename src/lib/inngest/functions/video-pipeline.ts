import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { generateVoiceover } from "@/src/lib/integrations/elevenlabs";
import { createHeyGenVideo, pollHeyGenVideo } from "@/src/lib/integrations/heygen";
import { searchUnsplash } from "@/src/lib/integrations/unsplash";

async function updateJob(
  jobId: string,
  updates: Record<string, unknown>
) {
  const supabase = createServiceClient();
  await supabase.from("video_jobs").update(updates).eq("id", jobId);
}

export const videoPipeline = inngest.createFunction(
  { id: "video-pipeline", retries: 2 },
  { event: "video/job.created" },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string };

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

    const scriptData = job.script_data as {
      voiceover_script?: string;
      script?: string;
      style?: string;
    } | null;
    const voiceoverText =
      scriptData?.voiceover_script || scriptData?.script || job.brief;

    // Step 2: Generate voiceover via ElevenLabs
    const voiceoverUrl = await step.run("generate-voiceover", async () => {
      await updateJob(jobId, {
        status: "generating_voice",
        progress_message: "Generating voiceover...",
      });

      const buffer = await generateVoiceover({
        text: voiceoverText,
        voiceId: job.voice_id ?? undefined,
      });

      const supabase = createServiceClient();
      const path = `${jobId}/voiceover.mp3`;
      const { error } = await supabase.storage
        .from("videos")
        .upload(path, buffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(path);

      return publicUrl;
    });

    // Step 3: Fetch thumbnail from Unsplash
    const thumbnailUrl = await step.run("fetch-thumbnail", async () => {
      const projectName =
        (job.projects as { name: string } | null)?.name ?? "marketing";
      const query = `${projectName} marketing technology`;

      try {
        const result = await searchUnsplash(query, {
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

    // Step 4: Submit to HeyGen
    const heygenJobId = await step.run("submit-heygen", async () => {
      await updateJob(jobId, {
        status: "generating_video",
        progress_message: "AI is recording your presenter...",
      });

      const { jobId: hgJobId } = await createHeyGenVideo({
        script: voiceoverText,
        voiceId: job.voice_id ?? undefined,
        backgroundUrl: thumbnailUrl ?? undefined,
      });

      await updateJob(jobId, {
        provider: "heygen",
        provider_job_id: hgJobId,
      });

      return hgJobId;
    });

    // Step 5: Poll HeyGen until done
    const videoUrl = await step.run("poll-heygen", async () => {
      const MAX_POLLS = 30;
      for (let i = 0; i < MAX_POLLS; i++) {
        // sleep 10s between polls
        await new Promise((r) => setTimeout(r, 10_000));

        const result = await pollHeyGenVideo(heygenJobId);

        if (result.status === "completed" && result.videoUrl) {
          // Download and re-store in Supabase (HeyGen URLs expire after 7 days)
          const videoRes = await fetch(result.videoUrl);
          if (!videoRes.ok) throw new Error("Failed to download video from HeyGen");
          const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

          const supabase = createServiceClient();
          const path = `${jobId}/final.mp4`;
          const { error } = await supabase.storage
            .from("videos")
            .upload(path, videoBuffer, {
              contentType: "video/mp4",
              upsert: true,
            });
          if (error) throw new Error(`Video storage upload failed: ${error.message}`);

          const {
            data: { publicUrl },
          } = supabase.storage.from("videos").getPublicUrl(path);

          await updateJob(jobId, {
            duration_seconds: result.duration ?? null,
          });

          return publicUrl;
        }

        if (result.status === "failed") {
          throw new Error(result.error ?? "HeyGen video generation failed");
        }

        await updateJob(jobId, {
          progress_message: `AI is recording your presenter... (${i + 1}/${MAX_POLLS})`,
        });
      }

      throw new Error("HeyGen generation timed out after 5 minutes");
    });

    // Step 6: Finalise
    await step.run("finalise", async () => {
      await updateJob(jobId, {
        status: "ready",
        video_url: videoUrl,
        progress_message: "Your video is ready!",
        completed_at: new Date().toISOString(),
      });
    });

    return { jobId, videoUrl };
  }
);
