import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  generateWithClaudeCompletion,
  TruncatedResponseError,
} from "@/src/lib/ai/client";
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

  // Generate (with automatic continuation on truncation — reuses any partial
  // output as an assistant prefill so Claude resumes from the exact character
  // it stopped at, no tokens regenerated).
  let result;
  try {
    result = await generateWithClaudeCompletion({
      systemPrompt,
      userPrompt,
      model: skill.model,
      maxTokens: skill.maxTokens,
    });
  } catch (err) {
    if (err instanceof TruncatedResponseError) {
      console.error(
        `[ai-generate] ${skill.id} truncated after ${err.attempts} attempts (${err.outputTokens} output tokens accumulated)`,
      );
      return NextResponse.json(
        {
          error:
            "Generation was cut short even after retrying. Please try again, or contact support if this keeps happening.",
          code: "generation_truncated",
          agent: skill.id,
        },
        { status: 502 },
      );
    }
    throw err;
  }

  // Parse response — if this fails on a complete response (stopReason !== max_tokens),
  // something is wrong with the model output itself. Surface it instead of
  // silently returning raw content as if it were valid data.
  let parsed;
  try {
    parsed = skill.parseResponse(result.content);
    parsed.usage = {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  } catch (parseErr) {
    console.error(
      `[ai-generate] ${skill.id} parse failure despite clean stop (${result.stopReason}):`,
      parseErr,
    );
    return NextResponse.json(
      {
        error:
          "We got a response but couldn't read it. Please try again — this usually works on retry.",
        code: "generation_parse_failed",
        agent: skill.id,
      },
      { status: 502 },
    );
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
