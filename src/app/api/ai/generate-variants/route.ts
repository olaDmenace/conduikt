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
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, agentId, originalContent, variantCount = 2 } = body;

  if (!projectId || !agentId || !originalContent) {
    return NextResponse.json(
      { error: "projectId, agentId, and originalContent are required" },
      { status: 400 }
    );
  }

  // Plan gate — Growth and Agency only
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const allowedPlans = ["growth", "agency"];
  if (!allowedPlans.includes(profile?.plan ?? "free")) {
    return NextResponse.json(
      {
        error: "A/B Variants are available on Growth and Agency plans.",
        upgradeUrl: "/settings/billing",
      },
      { status: 402 }
    );
  }

  const agent = getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const context = buildProjectContext(project);
  const count = Math.min(variantCount, 3);
  const variants: string[] = [];

  for (let i = 0; i < count; i++) {
    const systemPrompt = `${agent.buildSystemPrompt(context)}

IMPORTANT: You are generating variant ${String.fromCharCode(66 + i)} of content. The user already has variant A (the original). Generate a DIFFERENT version with a varied angle, opening hook, and tone while keeping the core message. Do not repeat the original version.`;

    const userPrompt = `Here is the original content (Variant A). Generate a distinctly different variant:

---
${originalContent}
---

Generate a completely different version. Vary the structure, angle, and hook. Keep the same core topic and intent.`;

    const result = await generateWithClaude({
      systemPrompt,
      userPrompt,
      model: agent.model,
      maxTokens: agent.maxTokens,
    });

    variants.push(result.content);

    await supabase.from("ai_generations").insert({
      project_id: projectId,
      agent_used: `${agentId}-variant`,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      model: result.model,
      duration_ms: result.durationMs,
    });
  }

  return NextResponse.json({ variants });
}
