import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { automationModeOf, factsFromProject, hasSomethingToCheck } from "@/src/lib/missing-pages/facts";
import { REVISION_COLUMNS, type PendingRevisionRow } from "@/src/lib/missing-pages/run";
import { hostedPagePath, hostedPageUrl, hostedSiteUrl, slugify } from "@/src/lib/hosted-pages/templates";

// GET: everything the Missing Pages screen shows: candidates, drafts (with
// the page JSON for the preview), recent runs, the publish target and the
// nightly flag.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, project } = ctx;

  const [{ data: candidates }, { data: runs }, { data: drafts }, { data: revisions }, { data: connections }] = await Promise.all([
    supabase
      .from("missing_page_candidates")
      .select("id, query, kind, matched_url, match_score, monthly_searches, competition, estimated, score, status, asset_id, hosted_page_id, readiness, last_error, updated_at")
      .eq("project_id", id)
      .neq("status", "dismissed")
      .order("score", { ascending: false })
      .limit(60),
    supabase.from("missing_page_runs").select("id, mode, started_at, finished_at, pages_crawled, queries_checked, gaps_found, pages_written, pages_published, error").eq("project_id", id).order("started_at", { ascending: false }).limit(10),
    supabase
      .from("hosted_pages")
      .select("id, site_slug, slug, title, meta_description, page, template, status, published_at, asset_id, updated_at")
      .eq("project_id", id)
      .order("updated_at", { ascending: false })
      .limit(30),
    // Re-written versions waiting for the owner's OK (owner-only table).
    supabase.from("hosted_page_revisions").select(REVISION_COLUMNS).eq("project_id", id),
    supabase.from("site_connections").select("id, kind, site_slug, base_url, username, updated_at").eq("project_id", id),
  ]);

  const hosted = (connections ?? []).find((c) => c.kind === "hosted");
  const wordpress = (connections ?? []).find((c) => c.kind === "wordpress");
  const facts = factsFromProject(project);
  const pendingByPage = new Map(((revisions ?? []) as PendingRevisionRow[]).map((r) => [r.hosted_page_id, r]));
  const withPending = (d: { id: string }) => {
    const r = pendingByPage.get(d.id);
    return r ? { pending_page: r.page, pending_asset_id: r.asset_id, pending_readiness: r.readiness, pending_at: r.updated_at ?? r.created_at ?? null } : {};
  };

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
      address: facts.address ?? null,
      city: facts.city ?? null,
      bookingUrl: facts.bookingUrl ?? null,
      // False when there is no website and no services: a run would have nothing to check.
      hasSomethingToCheck: hasSomethingToCheck(facts),
      settingsPath: `/projects/${id}/settings`,
    },
    target: {
      hosted: hosted ? { siteSlug: hosted.site_slug, url: hostedSiteUrl(hosted.site_slug), path: hostedPagePath(hosted.site_slug) } : null,
      wordpress: wordpress ? { baseUrl: wordpress.base_url, username: wordpress.username } : null,
      suggestedSiteSlug: hosted?.site_slug ?? slugify(project.name, 40),
    },
    candidates: candidates ?? [],
    drafts: (drafts ?? []).map((d) => ({ ...d, ...withPending(d), path: hostedPagePath(d.site_slug, d.slug), url: hostedPageUrl(d.site_slug, d.slug) })),
    runs: runs ?? [],
  });
}
