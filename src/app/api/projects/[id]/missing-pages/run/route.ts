import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { runMissingPages } from "@/src/lib/missing-pages/run";

// A crawl of up to 50 pages plus up to three page writes can take a while.
export const maxDuration = 300;

// POST: "Find missing pages". Crawls, scores, stores candidates and writes
// up to three pages as drafts (or live, for Hands off projects with a target).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, userId } = ctx;

  const rl = rateLimit(`missing-pages-run:${userId}`, { limit: 3, windowSeconds: 10 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  let maxPages = 1;
  try {
    const body = (await request.json().catch(() => ({}))) as { maxPages?: unknown };
    if (typeof body.maxPages === "number") maxPages = body.maxPages;
  } catch {
    // no body: defaults
  }
  maxPages = Math.max(0, Math.min(3, Math.floor(maxPages)));

  const result = await runMissingPages({ projectId: id, supabase, mode: "manual", maxPages });

  if (result.error?.code === "ai_unavailable") {
    return NextResponse.json({ error: result.error.message, code: "ai_unavailable", retryable: true, run: result }, { status: 503 });
  }
  if (result.error?.code === "generation_limit") {
    return NextResponse.json({ error: result.error.message, code: "generation_limit", run: result }, { status: 429 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error.message, run: result }, { status: 500 });
  }
  return NextResponse.json({ run: result });
}
