import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { searchUnsplash, triggerUnsplashDownload } from "@/src/lib/integrations/unsplash";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  const orientation = (request.nextUrl.searchParams.get("orientation") as
    | "landscape"
    | "portrait"
    | "squarish"
    | null) ?? "landscape";

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json(
      { configured: false, photos: [] },
      { status: 200 }
    );
  }

  try {
    const result = await searchUnsplash(query.trim(), { perPage: 12, orientation });
    return NextResponse.json({
      configured: true,
      photos: result.results.map((p) => ({
        id: p.id,
        url: p.urls.regular,
        thumb: p.urls.small,
        width: p.width,
        height: p.height,
        alt: p.alt_description ?? p.description ?? "",
        downloadLocation: p.links.download_location,
        attribution: {
          name: p.user.name,
          username: p.user.username,
          profileUrl: `${p.user.links.html}?utm_source=conduikt&utm_medium=referral`,
        },
      })),
    });
  } catch (err) {
    const message = process.env.NODE_ENV === "development" ? String(err) : "Failed to search photos";
    return NextResponse.json({ error: message, photos: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { downloadLocation } = await request.json();
  if (downloadLocation) await triggerUnsplashDownload(downloadLocation);
  return NextResponse.json({ ok: true });
}
