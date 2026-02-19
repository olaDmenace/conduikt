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
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json(
      { error: "UNSPLASH_ACCESS_KEY is not configured", photos: [] },
      { status: 200 } // Return gracefully — UI shows 'not configured' state
    );
  }

  try {
    const result = await searchUnsplash(query.trim(), { perPage: 9, orientation: "landscape" });
    return NextResponse.json({ photos: result.results, total: result.total });
  } catch (err) {
    return NextResponse.json({ error: String(err), photos: [] }, { status: 500 });
  }
}

// POST: record download (Unsplash attribution requirement)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { downloadLocation } = await request.json();
  if (downloadLocation) {
    await triggerUnsplashDownload(downloadLocation);
  }
  return NextResponse.json({ ok: true });
}
