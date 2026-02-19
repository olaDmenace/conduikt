import { NextResponse } from "next/server";

// Google Suggest API — no auth needed, public endpoint
const GOOGLE_SUGGEST_URL = "https://suggestqueries.google.com/complete/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const url = new URL(GOOGLE_SUGGEST_URL);
    url.searchParams.set("client", "firefox");
    url.searchParams.set("q", q.trim());
    url.searchParams.set("hl", "en");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    // Google returns: ["query", ["suggestion1", "suggestion2", ...]]
    const data = await response.json();
    const suggestions: string[] = Array.isArray(data?.[1]) ? data[1].slice(0, 10) : [];

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
