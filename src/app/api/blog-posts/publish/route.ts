import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// POST /api/blog-posts/publish
// Body: { assetId: string }
// Reads the blog_post asset, derives a slug, and inserts a row in
// blog_posts with status='published'. The marketing /blog/[slug]
// page revalidates every 60s so the post appears within a minute.
//
// Idempotent: re-publishing an already-published asset updates the
// existing blog_posts row instead of creating a duplicate.

interface BlogAssetContent {
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  content_markdown?: string;
  word_count?: number;
  reading_time_minutes?: number;
  featured_image_query?: string;
  social_promotion?: Record<string, unknown>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function deriveExcerpt(markdown: string, maxLen = 240): string {
  // First non-heading paragraph from the markdown body.
  const lines = markdown.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    return trimmed.slice(0, maxLen);
  }
  return markdown.slice(0, maxLen);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 publish actions per 5 minutes per user. Bursty by
  // design — someone bulk-publishing a campaign batch shouldn't hit
  // the limit, but it caps absurd loops.
  const rl = rateLimit(`blog-publish:${user.id}`, {
    limit: 30,
    windowSeconds: 300,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => ({}))) as {
    assetId?: string;
  };
  if (!body.assetId) {
    return NextResponse.json(
      { error: "assetId is required" },
      { status: 400 }
    );
  }

  // Pull the asset and verify ownership via the project relation. Assets
  // RLS already restricts to projects the user owns, so the SELECT
  // returning a row implies authorization.
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, type, content, project_id, title")
    .eq("id", body.assetId)
    .maybeSingle();

  if (assetError || !asset) {
    return NextResponse.json(
      { error: "Asset not found" },
      { status: 404 }
    );
  }

  if (asset.type !== "blog_post") {
    return NextResponse.json(
      { error: "This action only applies to blog_post assets" },
      { status: 400 }
    );
  }

  const content = (asset.content ?? {}) as BlogAssetContent;
  const markdown = content.content_markdown;
  if (!markdown) {
    return NextResponse.json(
      { error: "Asset has no content_markdown to publish" },
      { status: 400 }
    );
  }

  const title = content.meta_title ?? asset.title ?? "Untitled post";
  const slug =
    (content.slug && slugify(content.slug)) || slugify(title);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not derive a URL slug from the asset" },
      { status: 400 }
    );
  }

  const description =
    content.meta_description ?? deriveExcerpt(markdown, 160);
  const excerpt = deriveExcerpt(markdown, 240);

  // Project profile owner is what we attribute the post to in the DB
  // for RLS scoping. Use the calling user.
  const row = {
    slug,
    title,
    description,
    excerpt,
    author: "Olayinka Fagbenro",
    tags: [] as string[],
    reading_time_minutes: content.reading_time_minutes ?? null,
    sections: null,
    content_markdown: markdown,
    meta_title: content.meta_title ?? null,
    meta_description: content.meta_description ?? null,
    featured_image_query: content.featured_image_query ?? null,
    cta: { label: "Try Conduikt free", href: "/signup" },
    status: "published" as const,
    user_id: user.id,
    project_id: asset.project_id,
    source_asset_id: asset.id,
    date_published: new Date().toISOString(),
    date_modified: new Date().toISOString(),
  };

  // Idempotent upsert — re-publishing an asset updates the existing
  // row instead of duplicating. The unique constraint is on slug.
  const { data: published, error: writeError } = await supabase
    .from("blog_posts")
    .upsert(row, { onConflict: "slug" })
    .select("id, slug")
    .single();

  if (writeError || !published) {
    console.error("[blog-posts/publish] write error:", writeError);
    return NextResponse.json(
      {
        error:
          writeError?.message ??
          "Failed to publish — try a different slug, or contact support if this persists.",
      },
      { status: 500 }
    );
  }

  // Mark the asset as published so the Library reflects state.
  await supabase
    .from("assets")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", asset.id);

  return NextResponse.json({
    success: true,
    blogPostId: published.id,
    slug: published.slug,
    url: `https://conduikt.com/blog/${published.slug}/`,
  });
}
