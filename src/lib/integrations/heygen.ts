const HEYGEN_BASE = "https://api.heygen.com";

// Default avatar/voice IDs — override via env vars if needed
const DEFAULT_AVATAR_ID =
  process.env.HEYGEN_DEFAULT_AVATAR_ID ?? "Abigail_expressive_2024112501";
const DEFAULT_VOICE_ID =
  process.env.HEYGEN_DEFAULT_VOICE_ID ?? "007e1378fc454a9f976db570ba6164a7"; // Aria

export interface HeyGenVideoRequest {
  script: string;
  voiceId?: string;
  avatarId?: string;
  backgroundUrl?: string;
  title?: string;
}

export interface HeyGenVideoResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  duration?: number;
  error?: string;
}

export async function createHeyGenVideo(
  req: HeyGenVideoRequest
): Promise<{ jobId: string }> {
  const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: req.avatarId ?? DEFAULT_AVATAR_ID,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: req.script,
            voice_id: req.voiceId ?? DEFAULT_VOICE_ID,
          },
          background: req.backgroundUrl
            ? { type: "image", url: req.backgroundUrl }
            : { type: "color", value: "#1a1a2e" },
        },
      ],
      dimension: { width: 1280, height: 720 },
      aspect_ratio: "16:9",
      caption: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = res.statusText;
    try {
      const err = JSON.parse(errText);
      message = err.message ?? err.error ?? res.statusText;
    } catch { /* use statusText */ }
    throw new Error(`HeyGen API error (${res.status}): ${message}`);
  }

  const data = await res.json();
  return { jobId: data.data?.video_id ?? data.video_id };
}

export async function pollHeyGenVideo(
  jobId: string
): Promise<HeyGenVideoResponse> {
  const res = await fetch(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${jobId}`,
    {
      headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
    }
  );

  if (!res.ok) {
    throw new Error(`HeyGen status check failed: ${res.statusText}`);
  }

  const data = await res.json();
  const video = data.data;

  return {
    jobId,
    status:
      video.status === "completed"
        ? "completed"
        : video.status === "failed"
        ? "failed"
        : "processing",
    videoUrl: video.video_url ?? undefined,
    duration: video.duration ?? undefined,
    error: typeof video.error === "string"
      ? video.error
      : video.error ? JSON.stringify(video.error) : undefined,
  };
}

export async function listHeyGenAvatars() {
  const res = await fetch(`${HEYGEN_BASE}/v2/avatars`, {
    headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.avatars ?? [];
}
