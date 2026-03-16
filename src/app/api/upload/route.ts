import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string) || "logos";
  const path = (formData.get("path") as string) || `uploads/${user.id}/${Date.now()}`;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const filePath = `${path}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return NextResponse.json({ url: urlData.publicUrl });
}
