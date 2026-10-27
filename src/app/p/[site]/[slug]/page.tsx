import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/src/lib/supabase/service";
import { HostedPageView } from "@/src/lib/hosted-pages/render";
import { hostedPagePath, hostedPageUrl, hostedSiteUrl } from "@/src/lib/hosted-pages/templates";
import { pageJsonLd } from "@/src/lib/seo/schema-generator";
import { factsFromProject, type ProjectRow } from "@/src/lib/missing-pages/facts";
import type { HostedTemplate, MissingPageContent } from "@/src/lib/missing-pages/types";

// Public hosted page: /p/{site}/{slug}, and {site}.conduikt.site/{slug}
// through the host rewrite in middleware.ts. Published rows only; drafts
// 404 here and are previewed inside the dashboard instead.

export const revalidate = 300;

type Params = Promise<{ site: string; slug: string }>;

async function loadPage(site: string, slug: string) {
  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("hosted_pages")
    .select("id, project_id, site_slug, slug, title, meta_description, page, template, published_at, updated_at")
    .eq("site_slug", site)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!page) return null;
  const { data: project } = await supabase.from("projects").select("*").eq("id", page.project_id).single();
  if (!project) return null;
  return { page, project: project as ProjectRow };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { site, slug } = await params;
  const loaded = await loadPage(site, slug);
  if (!loaded) return { title: "Page not found", robots: { index: false } };
  const content = loaded.page.page as MissingPageContent;
  const canonical = hostedPageUrl(site, slug);
  return {
    title: content.title,
    description: loaded.page.meta_description ?? content.metaDescription,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title: content.title, description: content.metaDescription, url: canonical, type: "website", siteName: loaded.project.name },
  };
}

export default async function HostedPage({ params }: { params: Params }) {
  const { site, slug } = await params;
  const loaded = await loadPage(site, slug);
  if (!loaded) notFound();
  const facts = factsFromProject(loaded.project);
  const content = loaded.page.page as MissingPageContent;
  const template = loaded.page.template as HostedTemplate;
  const serviceName = facts.services.find((s) => content.title.toLowerCase().includes(s.toLowerCase())) ?? null;
  const jsonLd = pageJsonLd(content, facts, { pageUrl: hostedPageUrl(site, slug), siteUrl: hostedSiteUrl(site), serviceName, template });

  return <HostedPageView page={content} project={facts} template={template} jsonLd={jsonLd} siteHref={hostedPagePath(site)} />;
}
