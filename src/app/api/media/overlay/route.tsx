import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

interface Body {
  text: string;
  style?: "dark" | "light" | "brand";
  aspect?: "square" | "landscape" | "portrait";
}

const DIMENSIONS = {
  square: { w: 1080, h: 1080 },
  landscape: { w: 1200, h: 675 },
  portrait: { w: 1080, h: 1350 },
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }
  if (text.length > 280) {
    return NextResponse.json({ error: "Text must be 280 chars or fewer" }, { status: 400 });
  }

  const aspect = body.aspect ?? "square";
  const { w, h } = DIMENSIONS[aspect];
  const style = body.style ?? "brand";

  // Load brand kit
  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_logo_url, brand_primary_color, brand_secondary_color")
    .eq("id", user.id)
    .single();

  const primary = profile?.brand_primary_color ?? "#2F8C85";
  const secondary = profile?.brand_secondary_color ?? "#1A1A1A";
  const logo = profile?.brand_logo_url ?? null;

  const palette =
    style === "light"
      ? { bg: "#F5F1EA", fg: "#1A1A1A", accent: primary }
      : style === "dark"
      ? { bg: "#0A0A0A", fg: "#E8E4DE", accent: primary }
      : { bg: secondary, fg: "#E8E4DE", accent: primary };

  const fontSize = text.length < 80 ? 64 : text.length < 160 ? 52 : 42;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: palette.bg,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "8px",
            height: "100%",
            background: palette.accent,
          }}
        />
        <div
          style={{
            display: "flex",
            color: palette.accent,
            fontSize: 28,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {logo ? "" : "Conduikt"}
        </div>
        <div
          style={{
            display: "flex",
            color: palette.fg,
            fontSize,
            lineHeight: 1.2,
            fontWeight: 500,
            maxWidth: "90%",
          }}
        >
          {text}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: palette.fg,
            opacity: 0.6,
            fontSize: 22,
          }}
        >
          <span>{logo ? "" : ""}</span>
          <div
            style={{
              display: "flex",
              width: 48,
              height: 4,
              background: palette.accent,
            }}
          />
        </div>
      </div>
    ),
    { width: w, height: h }
  );

  const arrayBuffer = await image.arrayBuffer();
  const filePath = `${user.id}/overlay-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(filePath, new Uint8Array(arrayBuffer), {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(filePath);
  return NextResponse.json({
    url: urlData.publicUrl,
    path: filePath,
    width: w,
    height: h,
  });
}
