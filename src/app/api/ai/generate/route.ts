import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";
import { buildPerformanceContext } from "@/src/lib/ai/performance-context";
import {
  getGenerationLimit,
  isUnlimited,
  normalizePlan,
} from "@/src/lib/plans";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 AI generations per minute per user
  const rl = rateLimit(`ai-gen:${user.id}`, { limit: 10, windowSeconds: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await request.json();
  const { projectId, skillId, agentId, input } = body;

  // Validate agent
  const skill = getAgent(agentId ?? skillId);
  if (!skill) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check generation limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generation_count, generation_reset_at")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(profile?.plan);
  const limit = getGenerationLimit(plan);
  if (!isUnlimited(limit) && (profile?.generation_count ?? 0) >= limit) {
    return NextResponse.json(
      { error: "Generation limit reached. Upgrade your plan." },
      { status: 429 }
    );
  }

  // Build prompts with performance context
  const context = buildProjectContext(project);
  const performanceCtx = await buildPerformanceContext(projectId, supabase);
  if (performanceCtx) {
    context.performanceContext = performanceCtx;
  }
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
    agent_used: skill.id,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    model: result.model,
    duration_ms: result.durationMs,
  });

  // Increment generation count (atomic to prevent race conditions)
  await supabase.rpc("increment_generation_count", { user_id_param: user.id });

  return NextResponse.json(parsed);
}
