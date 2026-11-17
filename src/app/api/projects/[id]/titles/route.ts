import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { aiRefusedResponse, aiUnavailableResponse, isAiRefusedError, isAiUnavailableError, isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { factsFromProject } from "@/src/lib/missing-pages/facts";
import { ownerQuota } from "@/src/lib/missing-pages/run";
import { crawlSite } from "@/src/lib/crawl/site-crawler";
import { crawlUnreachable, crawlUnreachableMessage, SITE_UNREACHABLE } from "@/src/lib/crawl/unreachable";
import { generateWithClaude } from "@/src/lib/ai/client";
import { modelFor } from "@/src/lib/ai/model-routing";
import { MAX_TITLE_PAGES, parseTitlesResponse, rowChanges, titlesSystemPrompt, titlesUserPrompt, type TitleProposal } from "@/src/lib/seo/titles";

// Up to 30 page fetches plus one model call.
export const maxDuration = 180;

// GET: the latest proposal for this project, or null.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { data } = await ctx.supabase
    .from("assets")
    .select("id, content, created_at")
    .eq("project_id", id)
    .eq("type", "seo_titles")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return NextResponse.json({ proposal: null });
  return NextResponse.json({ proposal: { assetId: data.id, createdAt: data.created_at, ...(data.content as TitleProposal) } });
}

// POST: read up to 30 pages, propose an answer-first title and H1 for each,
// store the proposal as a "seo_titles" asset and count one generation.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase, userId, project } = ctx;

  const rl = await rateLimit(`titles:${userId}`, { limit: 3, windowSeconds: 10 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const facts = factsFromProject(project);
  if (!facts.websiteUrl) {
    return NextResponse.json({ error: "Add your website address in Settings first.", code: "no_website" }, { status: 400 });
  }

  const quota = await ownerQuota(supabase, id);
  if (!quota.ok) return NextResponse.json({ error: "Generation limit reached. Upgrade your plan.", code: "generation_limit" }, { status: 429 });

  const crawl = await crawlSite(facts.websiteUrl, { maxPages: MAX_TITLE_PAGES });
  // Nothing came back at all (bot challenge, timeout): say so rather than
  // asking the model about zero pages or calling the site empty.
  if (crawlUnreachable(crawl)) {
    return NextResponse.json({ error: crawlUnreachableMessage(crawl, facts.websiteUrl), code: SITE_UNREACHABLE, retryable: true }, { status: 502 });
  }
  if (crawl.pages.length === 0) {
    return NextResponse.json({ error: "We could not read any pages on your site. Check the address and that the site is public.", code: "no_pages" }, { status: 400 });
  }

  try {
    const result = await generateWithClaude({
      systemPrompt: titlesSystemPrompt(facts),
      userPrompt: titlesUserPrompt(crawl.pages),
      model: modelFor("generate"),
      maxTokens: 4000,
    });
    const rows = parseTitlesResponse(result.content, crawl.pages);
    const proposal: TitleProposal = { siteUrl: facts.websiteUrl, pagesRead: crawl.pages.length, generatedAt: new Date().toISOString(), rows };

    const host = (() => {
      try {
        return new URL(facts.websiteUrl!).hostname;
      } catch {
        return facts.websiteUrl!;
      }
    })();
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({ project_id: id, type: "seo_titles", title: `Titles and headings for ${host}`, content: proposal, status: "draft" })
      .select("id, created_at")
      .single();
    if (assetError || !asset) return NextResponse.json({ error: assetError?.message ?? "Could not save the proposal" }, { status: 500 });

    await supabase.from("ai_generations").insert({
      project_id: id,
      agent_used: "seo-titles",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      model: result.model,
      duration_ms: result.durationMs,
    });
    if (quota.userId) await supabase.rpc("increment_generation_count", { user_id_param: quota.userId });

    return NextResponse.json({ proposal: { assetId: asset.id, createdAt: asset.created_at, ...proposal }, changes: rows.filter(rowChanges).length });
  } catch (err) {
    if (isAiUnavailableError(err)) return aiUnavailableResponse(err);
    if (isAiRefusedError(err)) return aiRefusedResponse(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not write the titles" }, { status: 500 });
  }
}
