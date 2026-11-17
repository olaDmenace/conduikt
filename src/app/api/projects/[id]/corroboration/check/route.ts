import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { availableEngines, type EngineName } from "@/src/lib/integrations/ai-visibility";
import { corroborationQuestion, mentionedPlatforms } from "@/src/lib/corroboration/tasks";
import { AIRefusedError, AIUnavailableError } from "@/src/lib/ai/client";

// POST /api/projects/{id}/corroboration/check
// Asks every available answer engine "<business> <city>" and records, for
// each task, whether the engine cited that platform. Needs at least one
// engine (ANTHROPIC_API_KEY or PERPLEXITY_API_KEY); rate limited because
// it calls the model.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  const limit = rateLimit(`corroboration-check:${id}`, { limit: 3, windowSeconds: 3600 });
  if (!limit.allowed) return rateLimitResponse(limit);

  const engines = availableEngines().filter((e) => e.available);
  if (engines.length === 0) {
    return NextResponse.json(
      { error: "No answer engine is set up yet, so we can't check who mentions you." },
      { status: 400 }
    );
  }

  const question = corroborationQuestion({
    name: ctx.project.name,
    city: ctx.project.city,
    business_location: ctx.project.business_location,
  });
  if (!question) {
    return NextResponse.json({ error: "Give the project a name and a city first." }, { status: 400 });
  }

  const { data: rows, error } = await ctx.supabase
    .from("corroboration_tasks")
    .select("id, platform")
    .eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Build the list first." }, { status: 400 });
  }

  const citations: string[] = [];
  const asked: EngineName[] = [];
  for (const engine of engines) {
    try {
      const answer = await engine.ask(question);
      asked.push(engine.name);
      for (const c of answer.citations) if (!citations.includes(c)) citations.push(c);
    } catch (err) {
      if (err instanceof AIUnavailableError) {
        return NextResponse.json(
          { error: err.userMessage, code: "ai_unavailable", retryable: true },
          { status: 503 }
        );
      }
      if (err instanceof AIRefusedError) {
        return NextResponse.json(
          { error: err.userMessage, code: "ai_refused", retryable: false },
          { status: 422 }
        );
      }
      console.warn(`[corroboration] ${engine.name} failed:`, err instanceof Error ? err.message : err);
    }
  }
  if (asked.length === 0) {
    return NextResponse.json(
      { error: "We couldn't reach an answer engine. Try again in a few minutes." },
      { status: 503 }
    );
  }

  const platforms = rows.map((r) => r.platform as string);
  const mentioned = mentionedPlatforms(platforms, citations);
  const checkedAt = new Date().toISOString();

  await Promise.all(
    rows.map((r) =>
      ctx.supabase
        .from("corroboration_tasks")
        .update({ mentioned: mentioned[r.platform as string] ?? false, checked_at: checkedAt })
        .eq("id", r.id)
    )
  );

  return NextResponse.json({
    question,
    engines: asked,
    citations: citations.length,
    mentioned: platforms.filter((p) => mentioned[p]),
    checkedAt,
  });
}
