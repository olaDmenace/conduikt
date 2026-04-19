import { NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAnthropicClient } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import type { ProjectContext } from "@/src/lib/ai/agents/types";
import {
  getGenerationLimit,
  isUnlimited,
  normalizePlan,
} from "@/src/lib/plans";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

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

  // Rate limit: 10 AI streams per minute per user
  const rl = rateLimit(`ai-stream:${user.id}`, { limit: 10, windowSeconds: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

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

  const plan = normalizePlan(profile?.plan);
  const limit = getGenerationLimit(plan);
  if (!isUnlimited(limit) && (profile?.generation_count ?? 0) >= limit) {
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
      .eq("user_id", user.id)
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

  // How many times we'll try to continue from a prefill if Claude keeps
  // hitting max_tokens. Each round reuses the accumulated text as an
  // assistant prefill, so no tokens are regenerated.
  const MAX_CONTINUATIONS = 2;

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let inputTokens = 0;
      let outputTokens = 0;
      let fullText = "";
      let truncated = false;

      const sendEvent = (payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      try {
        for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
          const messages: Array<{
            role: "user" | "assistant";
            content: string;
          }> = [{ role: "user", content: userPrompt }];
          if (fullText) {
            messages.push({ role: "assistant", content: fullText });
          }

          const stream = anthropic.messages.stream({
            model: skill.model,
            max_tokens: skill.maxTokens,
            system: systemPrompt,
            messages,
          });

          stream.on("text", (text) => {
            fullText += text;
            sendEvent({ type: "text", text });
          });

          const finalMsg = await stream.finalMessage();
          inputTokens += finalMsg.usage.input_tokens;
          outputTokens += finalMsg.usage.output_tokens;

          if (finalMsg.stop_reason !== "max_tokens") {
            truncated = false;
            break;
          }

          // Hit max_tokens. If we have budget for another round, loop with
          // prefill. Otherwise flag truncated and bail.
          if (attempt === MAX_CONTINUATIONS) {
            truncated = true;
            console.error(
              `[ai-stream] ${skill.id} still truncated after ${MAX_CONTINUATIONS + 1} attempts (${outputTokens} output tokens)`,
            );
            break;
          }

          console.warn(
            `[ai-stream] ${skill.id} truncated on attempt ${attempt + 1}, continuing from ${fullText.length} chars`,
          );
        }

        const durationMs = Date.now() - start;

        if (truncated) {
          sendEvent({
            type: "error",
            error:
              "Generation was cut short even after retrying. Please try again.",
            code: "generation_truncated",
            partialLength: fullText.length,
          });
          controller.close();
          return;
        }

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

        // Increment generation count (atomic to prevent race conditions)
        await supabase.rpc("increment_generation_count", {
          user_id_param: user.id,
        });

        dispatchWebhooks(user.id, projectId ?? null, {
          event: "content.generated",
          title: `Content generated via ${skill.id}`,
          content: fullText.slice(0, 2000),
          contentType: skill.id,
          metadata: { agent: skill.id, inputTokens, outputTokens, durationMs },
        }).catch(() => {});

        sendEvent({
          type: "done",
          usage: { inputTokens, outputTokens, durationMs },
          plan,
        });
        controller.close();
      } catch (err) {
        const message =
          process.env.NODE_ENV === "development"
            ? err instanceof Error
              ? err.message
              : String(err)
            : "An unexpected error occurred";
        sendEvent({ type: "error", error: message });
        controller.close();
      }
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
