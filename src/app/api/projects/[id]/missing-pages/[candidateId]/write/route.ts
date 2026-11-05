import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { aiUnavailableResponse, isAiUnavailableError, isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { GenerationLimitError } from "@/src/lib/missing-pages/run";
import { factsFromProject } from "@/src/lib/missing-pages/facts";
import { writeCandidate, type CandidateRow } from "@/src/lib/missing-pages/run";
import { hostedPagePath, hostedPageUrl } from "@/src/lib/hosted-pages/templates";

export const maxDuration = 120;

// POST: "Write this page" for one candidate. Saves a draft; never publishes.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, userId, project } = ctx;

  const rl = rateLimit(`missing-pages-write:${userId}`, { limit: 10, windowSeconds: 10 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { data: candidate } = await supabase
    .from("missing_page_candidates")
    .select("id, project_id, query, kind, matched_url, status, score")
    .eq("id", candidateId)
    .eq("project_id", id)
    .single();
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (candidate.status === "writing") return NextResponse.json({ error: "This page is already being written" }, { status: 409 });

  try {
    const written = await writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: candidate as CandidateRow });
    return NextResponse.json({
      hostedPageId: written.hostedPageId,
      assetId: written.assetId,
      readiness: { score: written.review.score, ready: written.review.ready, fixes: written.review.fixes, applied: written.review.applied },
      page: written.hostedPage.page,
      path: hostedPagePath(written.hostedPage.site_slug, written.hostedPage.slug),
      url: hostedPageUrl(written.hostedPage.site_slug, written.hostedPage.slug),
    });
  } catch (err) {
    if (isAiUnavailableError(err)) return aiUnavailableResponse(err);
    if (err instanceof GenerationLimitError) {
      return NextResponse.json({ error: err.message, code: "generation_limit" }, { status: 429 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not write the page" }, { status: 500 });
  }
}
