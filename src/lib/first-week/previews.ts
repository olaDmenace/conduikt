import { AIUnavailableError, generateWithClaude } from "@/src/lib/ai/client";
import { modelFor } from "@/src/lib/ai/model-routing";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import { samplePreviews } from "@/src/lib/ai/samples";
import type { PageSignal } from "@/src/lib/onboarding/magic-audit";
import { firstWeekAgents, normalizePreviews, type AgentPreview, type FirstWeekAgentId } from "./plan";

// One model call that gives a short, real preview from each agent: enough
// to show what the full run would contain, cheap enough to offer to a
// signed-out visitor. Not a stand-in for the agent: the full output only
// comes from running the agent itself.
//
// When the writing service can't be reached, previews fall back to the
// generic samples in src/lib/ai/samples, each flagged `sample: true` so
// every surface can say so. AI_PREVIEW_MODE controls this:
//   fallback  (default) samples only when the model is unavailable
//   always    samples every time, no model call (demos, screenshots)
//   off       never samples; the error reaches the caller

export type PreviewMode = "fallback" | "always" | "off";

export function previewMode(): PreviewMode {
  const v = process.env.AI_PREVIEW_MODE?.trim().toLowerCase();
  return v === "always" || v === "off" ? v : "fallback";
}

/** A preview as shown: real, or a sample standing in for one. */
export type PreviewResult = AgentPreview & { sample?: boolean };

const SYSTEM_PROMPT = `You are previewing the work of several marketing agents for one website. For each agent listed, write what that agent would actually deliver for THIS site, condensed.

Respond with a single JSON object, no markdown:
{ "previews": [ { "agentId": string, "headline": string, "items": string[] } ] }

Rules:
- One entry per agent id given, using the id exactly.
- "headline": one specific sentence about this site (under 120 characters). Not a description of the agent.
- "items": 2 to 3 concrete outputs, each under 140 characters: real keyword phrases, a real draft subject line, a real headline option, a named competitor type, a real first step. No placeholders like "[Company]".
- Only use facts visible in the page content. Do not invent statistics, prices, customers or features.
- Plain words. No hashtags, no emojis, no exclamation marks.`;

export async function generateAgentPreviews(
  signal: PageSignal,
  agentIds: FirstWeekAgentId[]
): Promise<PreviewResult[]> {
  if (agentIds.length === 0) return [];
  const mode = previewMode();
  if (mode === "always") return samplePreviews(agentIds);

  const wanted = new Set(agentIds);
  const agents = firstWeekAgents().filter((a) => wanted.has(a.id));
  const userPrompt = `URL: ${signal.url}
TITLE: ${signal.title ?? "(not found)"}
META DESCRIPTION: ${signal.metaDescription ?? "(not found)"}
H1: ${signal.h1 ?? "(not found)"}

PAGE TEXT (excerpt):
${signal.bodyText || "(page returned no readable content)"}

AGENTS TO PREVIEW:
${agents.map((a) => `- ${a.id}: ${a.name}. ${a.job}`).join("\n")}`;

  let content: string;
  try {
    ({ content } = await generateWithClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      model: modelFor("preview"),
      maxTokens: 3500,
      temperature: 0.4,
    }));
  } catch (err) {
    if (err instanceof AIUnavailableError && mode === "fallback") {
      console.error(`[previews] writing service unavailable (${err.code}); showing samples for ${agentIds.length} agents`);
      return samplePreviews(agentIds);
    }
    throw err;
  }
  return normalizePreviews(parseJsonResponse(content)).filter((p) => wanted.has(p.agentId));
}

/** True when any preview in the list is a sample rather than a real result. */
export function hasSamplePreviews(previews: ReadonlyArray<{ sample?: boolean }>): boolean {
  return previews.some((p) => p.sample === true);
}
