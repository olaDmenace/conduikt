import { NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAnthropicClient } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import type { ProjectContext } from "@/src/lib/ai/agents/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { skillId, agentId, input, projectId } = body;

  const skill = getAgent(agentId ?? skillId);
  if (!skill) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check generation limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generation_count")
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
    return new Response(
      JSON.stringify({ error: "Generation limit reached. Upgrade your plan." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build context — either from a project or a minimal default
  let context: ProjectContext;
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (project) {
      context = {
        name: project.name,
        websiteUrl: project.website_url ?? "",
        description: project.description ?? undefined,
        targetAudience: project.target_audience as ProjectContext["targetAudience"],
        valueProposition: project.value_proposition ?? undefined,
        brandVoice: project.brand_voice as ProjectContext["brandVoice"],
        competitors: project.competitors as ProjectContext["competitors"],
        keywords: project.keywords as ProjectContext["keywords"],
      };
    } else {
      context = { name: "General", websiteUrl: "" };
    }
  } else {
    context = { name: "General", websiteUrl: "" };
  }

  const systemPrompt = skill.buildSystemPrompt(context);
  const userPrompt = skill.buildUserPrompt(input);

  const anthropic = getAnthropicClient();
  const start = Date.now();

  const stream = anthropic.messages.stream({
    model: skill.model,
    max_tokens: skill.maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let inputTokens = 0;
      let outputTokens = 0;

      stream.on("text", (text) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
        );
      });

      stream.on("message", (msg) => {
        inputTokens = msg.usage.input_tokens;
        outputTokens = msg.usage.output_tokens;
      });

      stream.on("end", async () => {
        const durationMs = Date.now() - start;

        // Log generation if project context exists
        if (projectId) {
          await supabase.from("ai_generations").insert({
            project_id: projectId,
            agent_used: skill.id,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            model: skill.model,
            duration_ms: durationMs,
          });
        }

        // Increment generation count
        await supabase
          .from("profiles")
          .update({
            generation_count: (profile?.generation_count ?? 0) + 1,
          })
          .eq("id", user.id);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              usage: { inputTokens, outputTokens, durationMs },
            })}\n\n`
          )
        );
        controller.close();
      });

      stream.on("error", (err) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`
          )
        );
        controller.close();
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
