// Server-side blog post queries. These hit the public.blog_posts table
// using the service-role client so they bypass RLS — the marketing
// blog pages render at conduikt.com without an auth session, and we
// only ever return rows where status='published' from these helpers,
// so opening up RLS-bypass here is safe and gives us simpler code.

import { createServiceClient } from "@/src/lib/supabase/service";

export interface BlogSection {
  heading: string;
  body: string[];
}

export interface BlogCta {
  label: string;
  href: string;
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  author: string;
  tags: string[];
  reading_time_minutes: number | null;
  sections: BlogSection[] | null;
  content_markdown: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cta: BlogCta;
  date_published: string;
  date_modified: string;
}

const SELECT_COLS = `
  id, slug, title, description, excerpt, author, tags,
  reading_time_minutes, sections, content_markdown,
  meta_title, meta_description, cta, date_published, date_modified
`;

export async function listPublishedBlogPosts(): Promise<BlogPostRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SELECT_COLS)
    .eq("status", "published")
    .order("date_published", { ascending: false });

  if (error) {
    console.error("[blog/queries] listPublishedBlogPosts:", error);
    return [];
  }
  return (data ?? []) as BlogPostRow[];
}

export async function getPublishedBlogPost(
  slug: string
): Promise<BlogPostRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[blog/queries] getPublishedBlogPost:", error);
    return null;
  }
  return (data as BlogPostRow) ?? null;
}

export async function getRelatedBlogPosts(
  slug: string,
  limit = 2
): Promise<BlogPostRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SELECT_COLS)
    .eq("status", "published")
    .neq("slug", slug)
    .order("date_published", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[blog/queries] getRelatedBlogPosts:", error);
    return [];
  }
  return (data ?? []) as BlogPostRow[];
}

/**
 * Conservative word count — used in JSON-LD. Falls back gracefully whether
 * the post is sections-format or markdown.
 */
export function countWords(post: BlogPostRow): number {
  if (post.content_markdown) {
    return post.content_markdown.split(/\s+/).filter(Boolean).length;
  }
  if (post.sections) {
    return post.sections.reduce(
      (sum, s) => sum + s.body.join(" ").split(/\s+/).filter(Boolean).length,
      0
    );
  }
  return 0;
}
