// Marketing-kit social cards. Returns a PNG via next/og's ImageResponse,
// rendered on demand. Two variants:
//   - 'square'    1080×1080 — Instagram, WhatsApp status, square thumbnails
//   - 'landscape' 1200×627  — X, LinkedIn share preview
//
// Cards are not user-personalised; every advocate downloads the same
// brand asset. The auth gate is purely to prevent scraping; we still
// allow embedding the rendered PNG into the /share preview by including
// the same auth cookie.
//
// Layout choices:
//   - Dark obsidian background, large typography in cream, with the
//     primary teal as a vertical accent rail on the left so the brand
//     is recognisable at thumbnail size.
//   - A single bold headline (no body copy) — social previews get
//     skimmed at glance speed, so we let the headline do all the work.
//   - The conduikt.com URL sits in the bottom corner, lower opacity so
//     it doesn't fight the headline.

import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createClient } from "@/src/lib/supabase/server";
import { PDF_BRAND as B } from "@/src/lib/pdf/brand";

export const runtime = "nodejs";

type Variant = "square" | "landscape";

const DIMENSIONS: Record<Variant, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  landscape: { w: 1200, h: 627 },
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const variantParam = url.searchParams.get("variant") ?? "square";
  const variant: Variant =
    variantParam === "landscape" ? "landscape" : "square";
  const { w, h } = DIMENSIONS[variant];

  const isSquare = variant === "square";
  const headlineSize = isSquare ? 96 : 78;
  const subSize = isSquare ? 32 : 26;
  const padding = isSquare ? 96 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${padding}px`,
          background: B.surface0,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Left accent rail — the brand teal stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "10px",
            height: "100%",
            background: B.accent,
          }}
        />
        {/* Bottom-right copper corner — secondary accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: isSquare ? "320px" : "260px",
            height: "10px",
            background: B.accentSecondary,
          }}
        />

        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: B.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: B.surface0,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div
            style={{
              color: B.textPrimary,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Conduikt
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: B.textPrimary,
            fontSize: headlineSize,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: "92%",
          }}
        >
          <span>AI Marketing</span>
          <span>Automation for</span>
          <span>
            <span style={{ color: B.accent }}>SaaS Founders.</span>
          </span>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: B.textSecondary,
              fontSize: subSize,
              letterSpacing: "0.02em",
            }}
          >
            Generate · Schedule · Ship — from one dashboard.
          </div>
          <div
            style={{
              color: B.accent,
              fontSize: subSize,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            conduikt.com
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        "Content-Disposition": `attachment; filename="conduikt-${variant}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    }
  );
}
