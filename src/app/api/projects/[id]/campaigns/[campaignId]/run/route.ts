import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";
import { buildPerformanceContext } from "@/src/lib/ai/performance-context";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id, campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch campaign + steps
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*, campaign_steps(id, step_order, agent_id, config, status)")
    .eq("id", campaignId)
    .eq("project_id", id)
    .order("step_order", { referencedTable: "campaign_steps", ascending: true })
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Mark campaign as running
  await supabase
    .from("campaigns")
    .update({ status: "running" })
    .eq("id", campaignId);

  const context = buildProjectContext(project);
  const performanceCtx = await buildPerformanceContext(id, supabase);
  if (performanceCtx) {
    context.performanceContext = performanceCtx;
  }

  const steps = campaign.campaign_steps as Array<{
    id: string;
    step_order: number;
    agent_id: string;
    config: Record<string, unknown>;
    status: string;
  }>;

  let previousOutput = "";
  let allSucceeded = true;

  for (const step of steps) {
    const agent = getAgent(step.agent_id);
    if (!agent) {
      // Mark step as failed — unknown agent
      await supabase
        .from("campaign_steps")
        .update({
          status: "failed",
          result: { error: `Unknown agent: ${step.agent_id}` },
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", step.id);
      allSucceeded = false;
      continue;
    }

    // Mark step as running
    await supabase
      .from("campaign_steps")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", step.id);

    try {
      // Build prompts — inject previous step output as additional context
      const input = { ...step.config };
      if (previousOutput) {
        input.context = `${input.context || ""}\n\n## Previous Step Output:\n${previousOutput}`.trim();
      }

      const systemPrompt = agent.buildSystemPrompt(context);
      const userPrompt = agent.buildUserPrompt(input);

      const result = await generateWithClaude({
        systemPrompt,
        userPrompt,
        model: agent.model,
        maxTokens: agent.maxTokens,
      });

      let parsed;
      try {
        parsed = agent.parseResponse(result.content);
        parsed.usage = {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } catch {
        parsed = {
          type: agent.id,
          data: { raw: result.content },
          usage: {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          },
        };
      }

      // Save step result
      await supabase
        .from("campaign_steps")
        .update({
          status: "completed",
          result: parsed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", step.id);

      // Log generation
      await supabase.from("ai_generations").insert({
        project_id: id,
        agent_used: agent.id,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        model: result.model,
        duration_ms: result.durationMs,
      });

      // Pipe output to next step
      previousOutput = result.content;
    } catch (err) {
      await supabase
        .from("campaign_steps")
        .update({
          status: "failed",
          result: { error: err instanceof Error ? err.message : "Unknown error" },
          completed_at: new Date().toISOString(),
        })
        .eq("id", step.id);
      allSucceeded = false;
      // Continue to next step even if one fails
      previousOutput = "";
    }
  }

  // Update campaign status
  await supabase
    .from("campaigns")
    .update({ status: allSucceeded ? "completed" : "failed" })
    .eq("id", campaignId);

  // Re-fetch final state
  const { data: final } = await supabase
    .from("campaigns")
    .select("*, campaign_steps(id, step_order, agent_id, status, result, started_at, completed_at)")
    .eq("id", campaignId)
    .order("step_order", { referencedTable: "campaign_steps", ascending: true })
    .single();

  return NextResponse.json(final);
}
