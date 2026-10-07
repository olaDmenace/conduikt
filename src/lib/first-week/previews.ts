import { generateWithClaude } from "@/src/lib/ai/client";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import type { PageSignal } from "@/src/lib/onboarding/magic-audit";
import { firstWeekAgents, normalizePreviews, type AgentPreview, type FirstWeekAgentId } from "./plan";

// One model call that gives a short, real preview from each agent: enough
// to show what the full run would contain, cheap enough to offer to a
// signed-out visitor. Not a stand-in for the agent: the full output only
// comes from running the agent itself.

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
): Promise<AgentPreview[]> {
  if (agentIds.length === 0) return [];
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

  const { content } = await generateWithClaude({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 3500,
    temperature: 0.4,
  });
  return normalizePreviews(parseJsonResponse(content)).filter((p) => wanted.has(p.agentId));
}
