import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { getSkill } from "@/src/lib/ai/skills";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, skillId, input } = body;

  // Validate skill
  const skill = getSkill(skillId);
  if (!skill) {
    return NextResponse.json({ error: "Unknown skill" }, { status: 400 });
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check generation limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generation_count, generation_reset_at")
    .eq("id", user.id)
    .single();

  const limits: Record<string, number> = {
    free: 5,
    pro: 100,
    growth: 999999,
    agency: 999999,
  };

  const limit = limits[profile?.plan ?? "free"] ?? 5;
  if ((profile?.generation_count ?? 0) >= limit) {
    return NextResponse.json(
      { error: "Generation limit reached. Upgrade your plan." },
      { status: 429 }
    );
  }

  // Build prompts
  const context = buildProjectContext(project);
  const systemPrompt = skill.buildSystemPrompt(context);
  const userPrompt = skill.buildUserPrompt(input);

  // Generate
  const result = await generateWithClaude({
    systemPrompt,
    userPrompt,
    model: skill.model,
    maxTokens: skill.maxTokens,
  });

  // Parse response
  let parsed;
  try {
    parsed = skill.parseResponse(result.content);
    parsed.usage = {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  } catch {
    parsed = {
      type: skill.id,
      data: { raw: result.content },
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    };
  }

  // Log generation
  await supabase.from("ai_generations").insert({
    project_id: projectId,
    skill_used: skill.id,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    model: result.model,
    duration_ms: result.durationMs,
  });

  // Increment generation count
  await supabase
    .from("profiles")
    .update({ generation_count: (profile?.generation_count ?? 0) + 1 })
    .eq("id", user.id);

  return NextResponse.json(parsed);
}
