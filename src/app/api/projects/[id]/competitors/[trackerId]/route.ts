import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; trackerId: string }> }
) {
  const { id, trackerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tracker } = await supabase
    .from("competitor_trackers")
    .select("*")
    .eq("id", trackerId)
    .eq("project_id", id)
    .single();

  if (!tracker) {
    return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name, website_url, keywords")
    .eq("id", id)
    .single();

  const systemPrompt = `You are an SEO competitor analysis expert. Analyze the competitor and provide insights compared to the user's site.

Respond with ONLY valid JSON:
{
  "keyword_overlap": number (estimated keyword overlap count),
  "content_gaps": ["topic 1", "topic 2", "topic 3"] (content topics competitor covers that the user doesn't),
  "estimated_da": number (estimated domain authority 0-100),
  "top_keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"] (competitor's likely top keywords),
  "summary": "2-3 sentence analysis of competitive positioning"
}`;

  const userPrompt = `Analyze this competitor:
URL: ${tracker.competitor_url}
Name: ${tracker.competitor_name || "Unknown"}

User's site: ${project?.website_url || "Unknown"}
User's project: ${project?.name || "Unknown"}
User's tracked keywords: ${JSON.stringify(project?.keywords || [])}

Provide a competitive analysis snapshot.`;

  try {
    const result = await generateWithClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 1500,
    });

    const parsed = JSON.parse(result.content);

    // Save snapshot
    await supabase.from("competitor_snapshots").insert({
      tracker_id: trackerId,
      keyword_overlap: parsed.keyword_overlap,
      content_gaps: parsed.content_gaps,
      estimated_da: parsed.estimated_da,
      top_keywords: parsed.top_keywords,
      snapshot_data: parsed,
    });

    // Update last_checked_at
    await supabase
      .from("competitor_trackers")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", trackerId);

    // Log generation
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      project_id: id,
      agent_used: "competitor-tracking",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      model: result.model,
      duration_ms: result.durationMs,
    });

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: "Analysis failed", details: String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; trackerId: string }> }
) {
  const { trackerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("competitor_trackers").delete().eq("id", trackerId);
  return NextResponse.json({ success: true });
}
