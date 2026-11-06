import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { factsFromProject } from "@/src/lib/missing-pages/facts";
import { publishCandidate } from "@/src/lib/missing-pages/run";
import { reviewPage } from "@/src/lib/missing-pages/review";
import { getPublishTarget, resolveSiteSlug, type HostedPageRow } from "@/src/lib/hosted-pages/publish";
import { hostedPageUrl, hostedSiteUrl } from "@/src/lib/hosted-pages/templates";

export const maxDuration = 60;

// POST: "Approve and publish". The draft must pass the editor check first.
// With no WordPress connection the page goes live on conduikt.site.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, project } = ctx;
  const facts = factsFromProject(project);

  const { data: candidate } = await supabase.from("missing_page_candidates").select("id, status, hosted_page_id, query").eq("id", candidateId).eq("project_id", id).single();
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!candidate.hosted_page_id) return NextResponse.json({ error: "Write the page first, then approve it" }, { status: 409 });

  const { data: hosted } = await supabase
    .from("hosted_pages")
    .select("id, project_id, site_slug, slug, title, meta_description, page, template, status, asset_id")
    .eq("id", candidate.hosted_page_id)
    .eq("project_id", id)
    .single();
  if (!hosted) return NextResponse.json({ error: "That draft is gone. Write the page again" }, { status: 404 });
  const hostedPage = hosted as HostedPageRow;

  // The editor check runs again at approval time so nothing slips through.
  const review = reviewPage({
    page: hostedPage.page,
    facts,
    template: hostedPage.template,
    siteUrl: hostedSiteUrl(hostedPage.site_slug),
    pageUrl: hostedPageUrl(hostedPage.site_slug, hostedPage.slug),
  });
  if (!review.ready) {
    return NextResponse.json({ error: "This page is not ready for Google and AI answers yet", fixes: review.fixes, score: review.score }, { status: 422 });
  }

  let target = await getPublishTarget(supabase, id);
  if (!target) {
    const siteSlug = await resolveSiteSlug(supabase, id, project.name);
    target = { kind: "hosted", siteSlug };
  }

  try {
    const out = await publishCandidate({ supabase, facts, candidateId: candidate.id, hostedPage: hostedPage, target });
    return NextResponse.json({ published: true, kind: out.kind, url: out.url });
  } catch (err) {
    await supabase.from("missing_page_candidates").update({ last_error: err instanceof Error ? err.message : "publish failed" }).eq("id", candidate.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not publish the page" }, { status: 502 });
  }
}
