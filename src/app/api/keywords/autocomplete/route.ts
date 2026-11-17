import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// Google Suggest API — proxied through our API to require auth
const GOOGLE_SUGGEST_URL = "https://suggestqueries.google.com/complete/search";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Typeahead fires per keystroke (debounced client-side); 60 per 10 min
  // is plenty for a person and stops a loop hammering Google through us.
  const rl = await rateLimit(`keyword-autocomplete:${user.id}`, { limit: 60, windowSeconds: 600 });
  if (!rl.allowed) return rateLimitResponse(rl);

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
