import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { automationModeOf, factsFromProject } from "@/src/lib/missing-pages/facts";
import { hostedPagePath, hostedPageUrl, hostedSiteUrl, slugify } from "@/src/lib/hosted-pages/templates";

// GET: everything the Missing Pages screen shows: candidates, drafts (with
// the page JSON for the preview), recent runs, the publish target and the
// nightly flag.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, project } = ctx;

  const [{ data: candidates }, { data: runs }, { data: drafts }, { data: connections }] = await Promise.all([
    supabase
      .from("missing_page_candidates")
      .select("id, query, kind, matched_url, match_score, monthly_searches, competition, estimated, score, status, asset_id, hosted_page_id, readiness, last_error, updated_at")
      .eq("project_id", id)
      .neq("status", "dismissed")
      .order("score", { ascending: false })
      .limit(60),
    supabase.from("missing_page_runs").select("id, mode, started_at, finished_at, pages_crawled, queries_checked, gaps_found, pages_written, pages_published, error").eq("project_id", id).order("started_at", { ascending: false }).limit(10),
    supabase.from("hosted_pages").select("id, site_slug, slug, title, meta_description, page, template, status, published_at, asset_id, updated_at").eq("project_id", id).order("updated_at", { ascending: false }).limit(30),
    supabase.from("site_connections").select("id, kind, site_slug, base_url, username, updated_at").eq("project_id", id),
  ]);

  const hosted = (connections ?? []).find((c) => c.kind === "hosted");
  const wordpress = (connections ?? []).find((c) => c.kind === "wordpress");
  const facts = factsFromProject(project);

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      websiteUrl: facts.websiteUrl,
      businessType: facts.businessType,
      automationMode: automationModeOf(project.automation_mode),
      missingPagesEnabled: !!project.missing_pages_enabled,
      location: facts.location,
      phone: facts.phone ?? null,
    },
    target: {
      hosted: hosted ? { siteSlug: hosted.site_slug, url: hostedSiteUrl(hosted.site_slug), path: hostedPagePath(hosted.site_slug) } : null,
      wordpress: wordpress ? { baseUrl: wordpress.base_url, username: wordpress.username } : null,
      suggestedSiteSlug: hosted?.site_slug ?? slugify(project.name, 40),
    },
    candidates: candidates ?? [],
    drafts: (drafts ?? []).map((d) => ({ ...d, path: hostedPagePath(d.site_slug, d.slug), url: hostedPageUrl(d.site_slug, d.slug) })),
    runs: runs ?? [],
  });
}
