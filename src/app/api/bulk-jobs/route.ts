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

  // Check plan — Growth or Agency only
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  if (plan !== "growth" && plan !== "agency") {
    return NextResponse.json(
      { error: "Bulk generation is available on Growth and Agency plans" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { projectId, agentId, inputs } = body as {
    projectId: string;
    agentId: string;
    inputs: string[];
  };

  if (!projectId || !agentId || !inputs?.length) {
    return NextResponse.json(
      { error: "projectId, agentId, and inputs array required" },
      { status: 400 }
    );
  }

  const total = Math.min(inputs.length, 30);
  const agent = getAgent(agentId);
  if (!agent)
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Create bulk job
  const { data: job, error: jobErr } = await supabase
    .from("bulk_jobs")
    .insert({
      user_id: user.id,
      project_id: projectId,
      agent_id: agentId,
      total,
      status: "running",
    })
    .select()
    .single();

  if (jobErr || !job)
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  // Process in background (non-blocking response)
  const context = buildProjectContext(project);
  const jobId = job.id;

  // Start async processing
  (async () => {
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < total; i++) {
      try {
        const systemPrompt = agent.buildSystemPrompt(context);
        const userPrompt = agent.buildUserPrompt({ topic: inputs[i], keyword: inputs[i] });

        const result = await generateWithClaude({
          systemPrompt,
          userPrompt,
          model: agent.model,
          maxTokens: agent.maxTokens,
        });

        // Save as asset
        let parsed;
        try {
          parsed = agent.parseResponse(result.content);
        } catch {
          parsed = { type: agent.id, data: { raw: result.content } };
        }

        await supabase.from("assets").insert({
          project_id: projectId,
          type: agent.id,
          title: inputs[i],
          content: parsed,
          status: "draft",
        });

        await supabase.from("ai_generations").insert({
          project_id: projectId,
          agent_used: `${agentId}-bulk`,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          model: result.model,
          duration_ms: result.durationMs,
        });

        completed++;
      } catch {
        failed++;
      }

      // Update progress
      await supabase
        .from("bulk_jobs")
        .update({ completed, failed })
        .eq("id", jobId);
    }

    // Mark complete
    await supabase
      .from("bulk_jobs")
      .update({
        completed,
        failed,
        status: failed === total ? "failed" : "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      project_id: projectId,
      type: "bulk_complete",
      title: `Bulk generation complete`,
      body: `${completed}/${total} pieces generated successfully`,
    });
  })();

  return NextResponse.json({ jobId: job.id, total }, { status: 201 });
}
