import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { AIRefusedError, AIUnavailableError, aiRefusedBody, aiUnavailableBody, generateWithClaude } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";
import { effortFor } from "@/src/lib/ai/model-routing";
import { blendAnswerability, scoreAnswerability } from "@/src/lib/seo/answerability";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Shares a window with /api/ai/score-content: same model, same job.
  const rl = await rateLimit(`content-score:${user.id}`, { limit: 20, windowSeconds: 600 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await request.json();
  const { projectId, content, contentType, postId } = body;

  if (!projectId || !content || content.length < 20) {
    return NextResponse.json(
      { error: "projectId and content (min 20 chars) required" },
      { status: 400 }
    );
  }

  if (!contentType) {
    return NextResponse.json(
      { error: "contentType required (social_post, blog_post, email, video_script, ad_copy)" },
      { status: 400 }
    );
  }

  // Fetch project for context
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const agent = getAgent("content-scorer");
  if (!agent) {
    return NextResponse.json(
      { error: "Content scorer agent not found" },
      { status: 500 }
    );
  }

  const context = buildProjectContext(project);
  const systemPrompt = agent.buildSystemPrompt(context);
  const userPrompt = agent.buildUserPrompt({ content, contentType });

  try {
    const result = await generateWithClaude({
      systemPrompt,
      userPrompt,
      model: agent.model,
      maxTokens: agent.maxTokens,
      effort: effortFor("score"),
    });

    const parsed = agent.parseResponse(result.content);
    const scoreData = parsed.data as {
      total_score: number;
      clarity: number;
      relevance: number;
      engagement_potential: number;
      brand_alignment: number;
      answerability: number | null;
      summary: string;
      top_strength: string;
      top_improvement: string;
    };

    // Answerability: half the model's judgement, half a deterministic check.
    const deterministic = scoreAnswerability(content, { businessName: project.name });
    scoreData.answerability = blendAnswerability(scoreData.answerability, deterministic.score);
    const answerabilityFixes = deterministic.fixes;

    // Persist score to content_scores table
    await supabase.from("content_scores").insert({
      project_id: projectId,
      post_id: postId || null,
      content_type: contentType,
      content_preview: content.slice(0, 280),
      total_score: scoreData.total_score,
      clarity: scoreData.clarity,
      relevance: scoreData.relevance,
      engagement_potential: scoreData.engagement_potential,
      brand_alignment: scoreData.brand_alignment,
      answerability: scoreData.answerability,
      summary: scoreData.summary,
      top_strength: scoreData.top_strength,
      top_improvement: scoreData.top_improvement,
    });

    // Log to ai_generations
    await supabase.from("ai_generations").insert({
      project_id: projectId,
      agent_used: "content-scorer",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      model: result.model,
      duration_ms: result.durationMs,
    });

    return NextResponse.json({ ...scoreData, answerability_fixes: answerabilityFixes });
  } catch (e) {
    if (e instanceof AIUnavailableError) return NextResponse.json(aiUnavailableBody(e), { status: 503 });
    if (e instanceof AIRefusedError) return NextResponse.json(aiRefusedBody(e), { status: 422 });
    const details = process.env.NODE_ENV === "development" ? String(e) : undefined;
    return NextResponse.json(
      { error: "Failed to score content", ...(details ? { details } : {}) },
      { status: 500 }
    );
  }
}
