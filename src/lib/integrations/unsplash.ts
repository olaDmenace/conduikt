// Unsplash API client — search photos and get download URLs
// Requires UNSPLASH_ACCESS_KEY env var

const BASE = "https://api.unsplash.com";

export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  alt_description: string | null;
  description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string; // ~1080px
    small: string;   // ~400px
    thumb: string;   // ~200px
  };
  links: {
    download_location: string; // must call to comply with Unsplash guidelines
  };
  user: {
    name: string;
    username: string;
    links: { html: string };
  };
}

export interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export async function searchUnsplash(
  query: string,
  options: { perPage?: number; orientation?: "landscape" | "portrait" | "squarish" } = {}
): Promise<UnsplashSearchResult> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const url = new URL(`${BASE}/search/photos`);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(options.perPage ?? 9));
  url.searchParams.set("orientation", options.orientation ?? "landscape");
  url.searchParams.set("content_filter", "high"); // safe content only

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
    },
    next: { revalidate: 3600 }, // cache 1h — same query, same results
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unsplash API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Trigger download (required by Unsplash guidelines when user selects a photo)
export async function triggerUnsplashDownload(downloadLocation: string): Promise<void> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return;
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${key}` },
    });
  } catch {
    // Non-critical — fire and forget
  }
}
