import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { factsFromProject } from "@/src/lib/missing-pages/facts";
import { approveRevision, discardRevision } from "@/src/lib/missing-pages/run";
import { getPublishTarget } from "@/src/lib/hosted-pages/publish";
import type { ReviewResult } from "@/src/lib/missing-pages/review";

export const maxDuration = 60;

// A re-written version of a page that is already live waits on the hosted
// row as a pending revision. POST approves it (swap it in and publish it
// where the live page is); DELETE keeps the live page and drops the draft.

async function loadCandidate(projectId: string, candidateId: string) {
  const ctx = await requireProjectOwner(projectId);
  if (isResponse(ctx)) return ctx;
  const { data: candidate } = await ctx.supabase
    .from("missing_page_candidates")
    .select("id, status, hosted_page_id")
    .eq("id", candidateId)
    .eq("project_id", projectId)
    .single();
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!candidate.hosted_page_id) return NextResponse.json({ error: "This search has no page yet" }, { status: 409 });
  return { ...ctx, candidate: candidate as { id: string; status: string; hosted_page_id: string } };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const loaded = await loadCandidate(id, candidateId);
  if (isResponse(loaded)) return loaded;
  const { supabase, project, candidate } = loaded;

  try {
    const target = await getPublishTarget(supabase, id);
    const out = await approveRevision({ supabase, facts: factsFromProject(project), candidateId: candidate.id, hostedPageId: candidate.hosted_page_id, target });
    return NextResponse.json({ published: true, kind: out.kind, url: out.url, readiness: { score: out.review.score, ready: out.review.ready, fixes: out.review.fixes } });
  } catch (err) {
    if (err instanceof Error && err.name === "RevisionNotReadyError") {
      const review = (err as Error & { review?: ReviewResult }).review;
      return NextResponse.json({ error: err.message, fixes: review?.fixes ?? [], score: review?.score ?? 0 }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Could not approve the new draft";
    const status = /no new draft|is gone/.test(message) ? 409 : 502;
    await supabase.from("missing_page_candidates").update({ last_error: message }).eq("id", candidate.id);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const loaded = await loadCandidate(id, candidateId);
  if (isResponse(loaded)) return loaded;
  try {
    await discardRevision(loaded.supabase, loaded.candidate.hosted_page_id);
    return NextResponse.json({ discarded: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not drop the draft" }, { status: 500 });
  }
}
