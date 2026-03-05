import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { content, contentType, targetKeyword, channel, projectId } = body;

  if (!content || content.length < 20) {
    return NextResponse.json(
      { error: "Content too short to score" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are a content quality scorer for a marketing automation platform. Analyze the provided content and return a JSON quality assessment.

Content type: ${contentType}
${targetKeyword ? `Target keyword: ${targetKeyword}` : ""}
${channel ? `Target channel: ${channel}` : ""}

Score each dimension 0-100:

1. **readability** — sentence complexity, word choice, flow, formatting, clarity
2. **seoFit** — ${contentType === "blog" ? "keyword usage, heading structure, meta quality, content length, internal linking opportunities" : "null (not applicable for this content type)"}
3. **engagementPotential** — hook strength, emotional appeal, call-to-action clarity, shareability, relevance

Calculate **overall** as a weighted average:
${contentType === "blog" ? "- readability 30% + seoFit 30% + engagementPotential 40%" : "- readability 30% + engagementPotential 70%"}

Determine **verdict**:
- "publish" if overall > 75
- "improve" if overall 50-75
- "rewrite" if overall < 50

Provide 2-4 specific, actionable **suggestions** that reference the actual content.

Respond with ONLY valid JSON, no markdown:
{
  "scores": {
    "readability": number,
    "seoFit": number | null,
    "engagementPotential": number,
    "overall": number
  },
  "suggestions": ["string", "string"],
  "verdict": "publish" | "improve" | "rewrite"
}`;

  try {
    const result = await generateWithClaude({
      systemPrompt,
      userPrompt: content,
      maxTokens: 800,
    });

    // Save to ai_generations
    if (projectId) {
      await supabase.from("ai_generations").insert({
        user_id: user.id,
        project_id: projectId,
        agent_used: "content-scorer",
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        model: result.model,
        duration_ms: result.durationMs,
      });
    }

    const parsed = JSON.parse(result.content);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to score content", details: String(e) },
      { status: 500 }
    );
  }
}
