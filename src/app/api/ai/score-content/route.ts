import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content, contentType, projectId, postId } = body;

  if (!content || content.length < 20) {
    return NextResponse.json(
      { error: "Content too short to score" },
      { status: 400 }
    );
  }

  const agent = getAgent("content-scorer");
  if (!agent) {
    return NextResponse.json(
      { error: "Content scorer agent not found" },
      { status: 500 }
    );
  }

  // Build project context if projectId is provided
  let systemPrompt: string;
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (project) {
      const context = buildProjectContext(project);
      systemPrompt = agent.buildSystemPrompt(context);
    } else {
      systemPrompt = agent.buildSystemPrompt({
        name: "Unknown",
        websiteUrl: "",
      });
    }
  } else {
    systemPrompt = agent.buildSystemPrompt({
      name: "Unknown",
      websiteUrl: "",
    });
  }

  const userPrompt = agent.buildUserPrompt({
    content,
    contentType: contentType || "general",
  });

  try {
    const result = await generateWithClaude({
      systemPrompt,
      userPrompt,
      model: agent.model,
      maxTokens: agent.maxTokens,
      temperature: 0,
    });

    const parsed = agent.parseResponse(result.content);
    const scoreData = parsed.data as {
      total_score: number;
      clarity: number;
      relevance: number;
      engagement_potential: number;
      brand_alignment: number;
      summary: string;
      top_strength: string;
      top_improvement: string;
    };

    // Persist score
    if (projectId) {
      await supabase.from("content_scores").insert({
        project_id: projectId,
        post_id: postId || null,
        content_type: contentType || "general",
        content_preview: content.slice(0, 280),
        total_score: scoreData.total_score,
        clarity: scoreData.clarity,
        relevance: scoreData.relevance,
        engagement_potential: scoreData.engagement_potential,
        brand_alignment: scoreData.brand_alignment,
        summary: scoreData.summary,
        top_strength: scoreData.top_strength,
        top_improvement: scoreData.top_improvement,
      });

      await supabase.from("ai_generations").insert({
        project_id: projectId,
        agent_used: "content-scorer",
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        model: result.model,
        duration_ms: result.durationMs,
      });
    }

    return NextResponse.json(scoreData);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to score content", details: String(e) },
      { status: 500 }
    );
  }
}
