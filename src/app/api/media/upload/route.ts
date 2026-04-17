import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — platform upload limits are ~5-10MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 media uploads per minute per user
  const rl = rateLimit(`media-upload:${user.id}`, { limit: 5, windowSeconds: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 }
    );
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPEG, WebP, or GIF." },
      { status: 400 }
    );
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
  });
}
