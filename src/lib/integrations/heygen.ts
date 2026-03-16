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
  backgroundStyle?: "studio" | "natural";
  title?: string;
  videoType?: "presenter" | "cinematic" | "ugc";
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
  const isUgc = req.videoType === "ugc";

  const avatarId = req.avatarId ?? DEFAULT_AVATAR_ID;

  const dimension = isUgc
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 };

  const aspectRatio = isUgc ? "9:16" : "16:9";

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
            avatar_id: avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: req.script,
            voice_id: req.voiceId ?? DEFAULT_VOICE_ID,
            ...(isUgc ? { speed: 1.0 } : {}),
          },
          background: req.backgroundUrl
            ? { type: "image", url: req.backgroundUrl }
            : {
                type: "color",
                value: req.backgroundStyle === "natural" ? "#F5F5F0" : "#1a1a2e",
              },
        },
      ],
      dimension,
      aspect_ratio: aspectRatio,
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

// ---------------------------------------------------------------------------
// Avatar utility layer — getAvatars, getUGCAvatars, selectRandom,
// selectBrandMatched, resolveUGCAvatar
// ---------------------------------------------------------------------------

export interface AvatarInfo {
  avatar_id: string;
  avatar_name: string;
  gender: "male" | "female" | "unknown";
  preview_image_url: string;
  preview_video_url: string;
}

// In-memory cache with 1-hour TTL
let avatarCache: { data: AvatarInfo[]; expiry: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getAvatars(): Promise<AvatarInfo[]> {
  if (avatarCache && Date.now() < avatarCache.expiry) {
    return avatarCache.data;
  }

  try {
    const res = await fetch(`${HEYGEN_BASE}/v2/avatars`, {
      headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
    });

    if (!res.ok) {
      console.warn(`[heygen] Failed to fetch avatars: ${res.status} ${res.statusText}`);
      return [];
    }

    const json = await res.json();
    const raw: unknown[] = json.data?.avatars ?? [];

    const avatars: AvatarInfo[] = raw.map((item: unknown) => {
      const a = item as Record<string, unknown>;
      return {
      avatar_id: (a.avatar_id as string) ?? "",
      avatar_name: (a.avatar_name as string) ?? "",
      gender: (["male", "female"].includes(a.gender as string)
        ? (a.gender as "male" | "female")
        : "unknown"),
      preview_image_url: (a.preview_image_url as string) ?? "",
      preview_video_url: (a.preview_video_url as string) ?? "",
    };
    });

    avatarCache = { data: avatars, expiry: Date.now() + CACHE_TTL_MS };
    return avatars;
  } catch (err) {
    console.warn("[heygen] Error fetching avatars:", err);
    return [];
  }
}

const UGC_KEYWORDS = ["ugc", "casual", "selfie", "natural", "lifestyle"];

export async function getUGCAvatars(
  gender?: "male" | "female"
): Promise<AvatarInfo[]> {
  const all = await getAvatars();

  let filtered = all.filter((a) =>
    UGC_KEYWORDS.some((kw) => a.avatar_name.toLowerCase().includes(kw))
  );

  if (gender) {
    filtered = filtered.filter((a) => a.gender === gender);
  }

  // If nothing matched the UGC filter, fall back to the full list
  // (optionally gender-filtered)
  if (filtered.length === 0) {
    return gender ? all.filter((a) => a.gender === gender) : all;
  }

  return filtered;
}

export interface ResolvedAvatar {
  avatarId: string;
  gender: "male" | "female" | "unknown";
}

export async function selectRandomAvatar(
  gender?: "male" | "female"
): Promise<ResolvedAvatar> {
  const pool = await getUGCAvatars(gender);

  if (pool.length === 0) {
    // Fallback level 1: try unfiltered pool
    const allAvatars = await getAvatars();
    if (allAvatars.length > 0) {
      return { avatarId: allAvatars[0].avatar_id, gender: allAvatars[0].gender };
    }
    // Fallback level 2: use DEFAULT_AVATAR_ID (already set for Presenter videos)
    if (DEFAULT_AVATAR_ID) {
      return { avatarId: DEFAULT_AVATAR_ID, gender: "unknown" };
    }
    // Fallback level 3: fail with a clear error
    throw new Error(
      "No HeyGen avatar available. The avatar API returned empty and no default avatar is configured. Check your HeyGen API key and account status."
    );
  }

  const idx = Math.floor(Math.random() * pool.length);
  const chosen = pool[idx];
  return { avatarId: chosen.avatar_id, gender: chosen.gender };
}

export interface BrandMatchContext {
  industry?: string;
  targetAudience?: string;
  brandVoice?: string;
  projectName: string;
}

export async function selectBrandMatchedAvatar(
  projectContext?: BrandMatchContext
): Promise<ResolvedAvatar> {
  const pool = await getUGCAvatars();

  if (pool.length === 0) {
    // Fallback level 1: try unfiltered pool
    const allAvatars = await getAvatars();
    if (allAvatars.length > 0) {
      return { avatarId: allAvatars[0].avatar_id, gender: allAvatars[0].gender };
    }
    // Fallback level 2: use DEFAULT_AVATAR_ID
    if (DEFAULT_AVATAR_ID) {
      return { avatarId: DEFAULT_AVATAR_ID, gender: "unknown" };
    }
    // Fallback level 3: fail with a clear error
    throw new Error(
      "No HeyGen avatar available. The avatar API returned empty and no default avatar is configured. Check your HeyGen API key and account status."
    );
  }

  if (!projectContext) {
    return selectRandomAvatar();
  }

  // Build the brand description
  const brandDesc = [
    projectContext.industry ? `Industry: ${projectContext.industry}.` : "",
    projectContext.targetAudience ? `Target audience: ${projectContext.targetAudience}.` : "",
    projectContext.brandVoice ? `Brand voice: ${projectContext.brandVoice}.` : "",
    `Project: ${projectContext.projectName}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // Build the avatar list
  const avatarList = pool
    .map((a) => `${a.avatar_id} | ${a.avatar_name} | ${a.gender}`)
    .join("\n");

  try {
    // Import dynamically to avoid circular deps at module init
    const { generateWithClaude } = await import("@/src/lib/ai/client");

    const result = await generateWithClaude({
      systemPrompt:
        "You are a casting director. You will be given a brand description and a list of available video avatars. Your job is to pick the single avatar that best represents this brand to its target audience. Consider that the chosen avatar's gender will determine the voice used in the video. Pick an avatar whose gender presentation is appropriate for the brand and audience described. Reply with only the avatar_id of your choice. No explanation.",
      userPrompt: `Brand description:\n${brandDesc}\n\nAvailable avatars:\navatar_id | avatar_name | gender\n${avatarList}`,
      model: "claude-sonnet-4-6",
      maxTokens: 100,
    });

    const chosenId = result.content.trim();

    // Validate that the returned ID is actually in our pool
    const exact = pool.find((a) => a.avatar_id === chosenId);
    if (exact) {
      return { avatarId: exact.avatar_id, gender: exact.gender };
    }

    // Try to find a partial match (Claude might return extra whitespace)
    const partial = pool.find((a) => result.content.includes(a.avatar_id));
    if (partial) {
      return { avatarId: partial.avatar_id, gender: partial.gender };
    }

    // Fallback
    return selectRandomAvatar();
  } catch (err) {
    console.warn("[heygen] Brand-matched avatar selection failed:", err);
    return selectRandomAvatar();
  }
}

export interface ResolveAvatarOptions {
  gender?: "male" | "female";
  selectedAvatarId?: string;
  projectContext?: BrandMatchContext;
}

export async function resolveUGCAvatar(
  mode: "random" | "pick" | "brand-matched",
  options: ResolveAvatarOptions = {}
): Promise<ResolvedAvatar> {
  try {
    if (mode === "pick") {
      if (options.selectedAvatarId) {
        // Look up gender from the pool if possible
        const all = await getAvatars();
        const match = all.find((a) => a.avatar_id === options.selectedAvatarId);
        return {
          avatarId: options.selectedAvatarId,
          gender: match?.gender ?? options.gender ?? "unknown",
        };
      }
      return selectRandomAvatar(options.gender);
    }

    if (mode === "brand-matched") {
      if (options.projectContext) {
        return selectBrandMatchedAvatar(options.projectContext);
      }
      return selectRandomAvatar(options.gender);
    }

    // Default: random
    return selectRandomAvatar(options.gender);
  } catch (err) {
    console.warn("[heygen] resolveUGCAvatar failed, falling back:", err);
    // Fallback level 1: try unfiltered pool
    try {
      const allAvatars = await getAvatars();
      if (allAvatars.length > 0) {
        return { avatarId: allAvatars[0].avatar_id, gender: allAvatars[0].gender };
      }
    } catch {
      // API completely unreachable
    }
    // Fallback level 2: use DEFAULT_AVATAR_ID
    if (DEFAULT_AVATAR_ID) {
      return { avatarId: DEFAULT_AVATAR_ID, gender: "unknown" };
    }
    // Fallback level 3: fail with a clear error
    throw new Error(
      "No HeyGen avatar available. The avatar API returned empty and no default avatar is configured. Check your HeyGen API key and account status."
    );
  }
}
