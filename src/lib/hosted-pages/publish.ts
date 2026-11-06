// Publishing a draft: either flip the hosted page live on conduikt.site or
// push it to the customer's WordPress. Shared by the Approve route and the
// nightly run (Hands off mode).

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/src/lib/crypto/tokens";
import { upsertWordPressPage, type WordPressConnection } from "@/src/lib/integrations/wordpress";
import { pageJsonLd } from "@/src/lib/seo/schema-generator";
import type { HostedTemplate, MissingPageContent, ProjectFacts } from "@/src/lib/missing-pages/types";
import { renderPageHtml } from "./html";
import { hostedPagePath, hostedPageUrl, slugify } from "./templates";

export type PublishTarget =
  | { kind: "hosted"; siteSlug: string }
  | { kind: "wordpress"; connection: WordPressConnection };

export interface SiteConnectionRow {
  id: string;
  project_id: string;
  kind: "hosted" | "wordpress";
  site_slug: string | null;
  base_url: string | null;
  username: string | null;
  secret_encrypted: string | null;
}

/** WordPress wins when both exist: it is the customer's real site. */
export function targetFromConnections(rows: SiteConnectionRow[]): PublishTarget | null {
  const wp = rows.find((r) => r.kind === "wordpress" && r.base_url && r.username && r.secret_encrypted);
  if (wp) {
    return { kind: "wordpress", connection: { baseUrl: wp.base_url!, username: wp.username!, appPassword: decryptToken(wp.secret_encrypted!) } };
  }
  const hosted = rows.find((r) => r.kind === "hosted" && r.site_slug);
  if (hosted) return { kind: "hosted", siteSlug: hosted.site_slug! };
  return null;
}

export async function getPublishTarget(supabase: SupabaseClient, projectId: string): Promise<PublishTarget | null> {
  const { data } = await supabase.from("site_connections").select("id, project_id, kind, site_slug, base_url, username, secret_encrypted").eq("project_id", projectId);
  return targetFromConnections((data ?? []) as SiteConnectionRow[]);
}

/** The site slug for a project: its hosted connection, else a slug of its name. */
export async function resolveSiteSlug(supabase: SupabaseClient, projectId: string, projectName: string): Promise<string> {
  const { data } = await supabase.from("site_connections").select("site_slug").eq("project_id", projectId).eq("kind", "hosted").maybeSingle();
  if (data?.site_slug) return data.site_slug as string;
  const base = slugify(projectName, 40);
  // Claim it so two projects with the same name never share a site.
  for (const candidate of [base, `${base}-${projectId.slice(0, 6)}`]) {
    const { error } = await supabase.from("site_connections").insert({ project_id: projectId, kind: "hosted", site_slug: candidate });
    if (!error) return candidate;
    if (error.code !== "23505") break;
    // 23505 = unique violation: the slug belongs to someone else, try the suffixed one
    const { data: ours } = await supabase.from("site_connections").select("site_slug").eq("project_id", projectId).eq("kind", "hosted").maybeSingle();
    if (ours?.site_slug) return ours.site_slug as string;
  }
  return `${base}-${projectId.slice(0, 6)}`;
}

export interface HostedPageRow {
  id: string;
  project_id: string;
  site_slug: string;
  slug: string;
  title: string;
  meta_description: string | null;
  page: MissingPageContent;
  template: HostedTemplate;
  status: "draft" | "published";
  asset_id: string | null;
}

/** Flip a hosted page live. Returns both URLs (wildcard host and /p path). */
export async function publishHostedPage(supabase: SupabaseClient, hostedPageId: string): Promise<{ url: string; path: string }> {
  const { data, error } = await supabase
    .from("hosted_pages")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", hostedPageId)
    .select("site_slug, slug, asset_id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Page not found");
  if (data.asset_id) await supabase.from("assets").update({ status: "published", published_at: new Date().toISOString() }).eq("id", data.asset_id);
  return { url: hostedPageUrl(data.site_slug, data.slug), path: hostedPagePath(data.site_slug, data.slug) };
}

/** Push a page to WordPress (create or update by slug). */
export async function publishToWordPress(
  connection: WordPressConnection,
  input: { slug: string; page: MissingPageContent; facts: ProjectFacts; template: HostedTemplate; serviceName?: string | null },
  fetchImpl?: Parameters<typeof upsertWordPressPage>[2]
): Promise<{ link: string; created: boolean }> {
  const siteUrl = connection.baseUrl.replace(/\/$/, "");
  const pageUrl = `${siteUrl}/${input.slug}/`;
  const jsonLd = pageJsonLd(input.page, input.facts, { pageUrl, siteUrl, serviceName: input.serviceName ?? null, template: input.template });
  const content = renderPageHtml(input.page, { jsonLd, omitH1: true });
  const res = await upsertWordPressPage(connection, { slug: input.slug, title: input.page.title, content, excerpt: input.page.metaDescription, status: "publish" }, fetchImpl);
  return { link: res.link, created: res.created };
}

export interface PublishDraftInput {
  supabase: SupabaseClient;
  hostedPage: HostedPageRow;
  facts: ProjectFacts;
  target: PublishTarget;
  serviceName?: string | null;
}

/** Publish one draft to the project's target. Returns where it went. */
export async function publishDraft(input: PublishDraftInput): Promise<{ kind: PublishTarget["kind"]; url: string }> {
  const { supabase, hostedPage, facts, target } = input;
  if (target.kind === "hosted") {
    const { url } = await publishHostedPage(supabase, hostedPage.id);
    return { kind: "hosted", url };
  }
  const { link } = await publishToWordPress(target.connection, { slug: hostedPage.slug, page: hostedPage.page, facts, template: hostedPage.template, serviceName: input.serviceName });
  // The hosted row stays a draft (it is not public on conduikt.site); the
  // asset is what the library shows as published.
  const now = new Date().toISOString();
  await supabase.from("hosted_pages").update({ published_at: now }).eq("id", hostedPage.id);
  if (hostedPage.asset_id) await supabase.from("assets").update({ status: "published", published_at: now }).eq("id", hostedPage.asset_id);
  return { kind: "wordpress", url: link };
}
