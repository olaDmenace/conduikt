import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// Image and video upload endpoint for post media. Routed to the same
// storage bucket (post-media) so the publish handlers can fetch the
// resulting public URL identically. Size limits are split per kind:
// images are tight (5MB — most platforms cap there), videos go up to
// the strictest cross-platform ceiling (LinkedIn = 200MB).
const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB — LinkedIn ceiling

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 media uploads per minute per user.
  const rl = rateLimit(`media-upload:${user.id}`, { limit: 5, windowSeconds: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Branch on type: image vs video. Reject anything else.
  const isImage = ALLOWED_IMAGE.includes(file.type);
  const isVideo = ALLOWED_VIDEO.includes(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Images: PNG/JPEG/WebP/GIF. Videos: MP4/MOV/WebM.",
      },
      { status: 400 }
    );
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    const maxLabel = isVideo ? "200MB" : "5MB";
    return NextResponse.json(
      { error: `File too large (max ${maxLabel} for ${isVideo ? "video" : "image"})` },
      { status: 400 }
    );
  }

  // Path layout: <user_id>/<image|video>/<timestamp>-<random>.<ext>
  // The kind subfolder is just for human navigability of the bucket;
  // the public URL works identically for either.
  const kindFolder = isVideo ? "video" : "image";
  const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "png")).toLowerCase();
  const filePath = `${user.id}/${kindFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(filePath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(filePath);
  return NextResponse.json({
    url: urlData.publicUrl,
    path: filePath,
    size: file.size,
    mimeType: file.type,
    kind: isVideo ? "video" : "image",
  });
}
