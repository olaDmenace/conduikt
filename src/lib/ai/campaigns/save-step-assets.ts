// Auto-save campaign step outputs into the assets table so users don't
// have to copy-paste each result into the Library by hand. Called from
// /api/projects/[id]/campaigns/[campaignId]/run after a step completes.
//
// Branches on agent_id — only publishable agents (blog-post,
// social-content, email-sequence) produce content worth saving as
// assets. Research-only agents (keyword-research, seo-audit, cro,
// content-strategy, posting-plan, etc.) keep their result in the
// step's result column for review but don't fan out to the Library.
//
// Mapping intent:
// - blog-post -> 1 row, type=blog_post, channel=web, full markdown
//   stored on content.markdown alongside the meta fields
// - social-content -> N rows, one per post, type=social_post,
//   channel=x|linkedin|facebook based on each post's platform field
// - email-sequence -> N rows, one per email step, type=email,
//   channel=email, body_html and metadata stored on content
//
// Multiple rows from one step share a `variant_group_id` so the UI
// can group them. Returns the list of created asset IDs so the run
// route can attach them to the step's result for visibility.

import type { SupabaseClient } from "@supabase/supabase-js";

interface SaveContext {
  supabase: SupabaseClient;
  projectId: string;
  campaignId: string;
  agentId: string;
  // Parsed agent output (already extracted by parseResponse).
  // Shape: the `data` field returned from the agent's parser.
  data: unknown;
}

export interface SavedAssetSummary {
  id: string;
  type: string;
  channel: string | null;
  title: string | null;
}

interface BlogPostData {
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  content_markdown?: string;
  word_count?: number;
  reading_time_minutes?: number;
  social_promotion?: Record<string, unknown>;
  featured_image_query?: string;
}

interface SocialPostData {
  platform?: string;
  text?: string;
  hook?: string;
  angle?: string;
  image_suggestion?: string | null;
  best_time?: string;
}

interface EmailStepData {
  step?: number;
  delay_hours?: number;
  subject_line?: string;
  preview_text?: string;
  body_html?: string;
  cta_text?: string;
  cta_url?: string;
  goal?: string;
}

// Generate a deterministic-ish UUID-like grouping key per save call. We
// don't need crypto-strong uniqueness — Supabase will generate the row
// IDs themselves, and we just need a shared `variant_group_id` for
// rows produced together. Postgres uuid type accepts this format.
function makeGroupId(): string {
  return crypto.randomUUID();
}

export async function saveCampaignStepAssets(
  ctx: SaveContext
): Promise<SavedAssetSummary[]> {
  const { supabase, projectId, campaignId, agentId, data } = ctx;

  if (!data || typeof data !== "object") return [];

  switch (agentId) {
    case "blog-post":
      return saveBlogPost(
        supabase,
        projectId,
        campaignId,
        data as BlogPostData
      );
    case "social-content":
      return saveSocialPosts(
        supabase,
        projectId,
        campaignId,
        data as { posts?: SocialPostData[] }
      );
    case "email-sequence":
      return saveEmailSequence(
        supabase,
        projectId,
        campaignId,
        data as { sequence_name?: string; emails?: EmailStepData[] }
      );
    default:
      // Research / strategy / audit agents — nothing to save as a
      // publishable asset. The step's result column already retains
      // the full output for in-runner review.
      return [];
  }
}

async function saveBlogPost(
  supabase: SupabaseClient,
  projectId: string,
  campaignId: string,
  blog: BlogPostData
): Promise<SavedAssetSummary[]> {
  if (!blog.content_markdown) return [];

  const row = {
    project_id: projectId,
    campaign_id: campaignId,
    type: "blog_post",
    channel: "web",
    title: blog.meta_title ?? blog.slug ?? "Untitled blog post",
    content: blog,
    status: "draft" as const,
  };

  const { data: inserted, error } = await supabase
    .from("assets")
    .insert(row)
    .select("id, type, channel, title")
    .single();

  if (error || !inserted) {
    console.error("[campaign-auto-save] blog-post insert failed:", error);
    return [];
  }
  return [inserted as SavedAssetSummary];
}

async function saveSocialPosts(
  supabase: SupabaseClient,
  projectId: string,
  campaignId: string,
  data: { posts?: SocialPostData[] }
): Promise<SavedAssetSummary[]> {
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  if (posts.length === 0) return [];

  // Tag every post in this batch with the same variant_group_id so the
  // Library can show them as a single set ("5 posts from Monthly
  // Content Sprint step 3"). Channel maps post.platform to the
  // assets.channel column directly; default to "x" if unspecified.
  const groupId = makeGroupId();
  const rows = posts
    .filter((p) => typeof p.text === "string" && p.text.trim().length > 0)
    .map((p, index) => ({
      project_id: projectId,
      campaign_id: campaignId,
      type: "social_post",
      channel: normalizeSocialChannel(p.platform),
      title: p.hook?.slice(0, 80) ?? `Social post ${index + 1}`,
      content: p,
      status: "draft" as const,
      variant_group_id: groupId,
      variant_label: `Post ${index + 1}`,
    }));

  if (rows.length === 0) return [];

  const { data: inserted, error } = await supabase
    .from("assets")
    .insert(rows)
    .select("id, type, channel, title");

  if (error) {
    console.error("[campaign-auto-save] social-content insert failed:", error);
    return [];
  }
  return (inserted ?? []) as SavedAssetSummary[];
}

async function saveEmailSequence(
  supabase: SupabaseClient,
  projectId: string,
  campaignId: string,
  data: { sequence_name?: string; emails?: EmailStepData[] }
): Promise<SavedAssetSummary[]> {
  const emails = Array.isArray(data?.emails) ? data.emails : [];
  if (emails.length === 0) return [];

  const groupId = makeGroupId();
  const sequenceName = data.sequence_name ?? "Email sequence";

  const rows = emails
    .filter(
      (e) => typeof e.body_html === "string" && e.body_html.trim().length > 0
    )
    .map((e, index) => ({
      project_id: projectId,
      campaign_id: campaignId,
      type: "email",
      channel: "email",
      title: e.subject_line ?? `${sequenceName} — Email ${index + 1}`,
      content: { ...e, sequence_name: sequenceName },
      status: "draft" as const,
      variant_group_id: groupId,
      variant_label: `Step ${e.step ?? index + 1}`,
    }));

  if (rows.length === 0) return [];

  const { data: inserted, error } = await supabase
    .from("assets")
    .insert(rows)
    .select("id, type, channel, title");

  if (error) {
    console.error("[campaign-auto-save] email-sequence insert failed:", error);
    return [];
  }
  return (inserted ?? []) as SavedAssetSummary[];
}

function normalizeSocialChannel(platform?: string): string {
  const p = (platform ?? "x").toLowerCase().trim();
  if (p === "twitter") return "x";
  if (p === "facebook" || p === "fb") return "facebook";
  if (p === "linkedin") return "linkedin";
  if (p === "x") return "x";
  return "x";
}
