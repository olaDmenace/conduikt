// "Your first week" — what runs when someone gives us their website.
//
// Signed-out visitors get the site audit plus a short real preview from
// every agent (one model call). Signed-in users get every agent their plan
// includes run for real, and a preview for the rest with an upgrade path.
// This module is pure: inputs, plan split and preview normalisation, so it
// can be unit-tested without Supabase or the model.

import { AGENT_REGISTRY, type AgentDefinition } from "@/src/lib/ai/agents/registry";
import { agentDisplay } from "@/src/lib/ai/agents/display";
import { isPlanAtLeast, type PlanTier } from "@/src/lib/plans";

/** What we know about the site before any agent runs. */
export interface SiteBrief {
  url: string;
  hostname: string;
  title: string | null;
  h1: string | null;
  metaDescription: string | null;
  valueProposition: string;
  audience: string;
  tone: string;
  seoScore: number | null;
  /** Raw HTML (capped) for the agents that read the page itself. */
  html: string;
}

// Agents that make sense to run unattended on a fresh website. Campaign
// is left out on purpose: it chains other agents, which is what this
// whole pack already does. Calendar and Client Reports are tools.
export const FIRST_WEEK_AGENT_IDS = [
  "seo-audit",
  "social-content",
  "keyword-research",
  "copywriting",
  "page-cro",
  "email-sequence",
  "content-strategy",
  "posting-plan",
  "competitor-analysis",
  "blog-post",
  "growth-playbook",
  "launch-strategy",
  "video-ad",
  "ab-test-setup",
  "programmatic-seo",
] as const;

export type FirstWeekAgentId = (typeof FIRST_WEEK_AGENT_IDS)[number];

export interface FirstWeekAgent {
  id: FirstWeekAgentId;
  name: string;
  job: string;
  tier: AgentDefinition["tier"];
}

export function firstWeekAgents(): FirstWeekAgent[] {
  return FIRST_WEEK_AGENT_IDS.map((id) => {
    const def = AGENT_REGISTRY.find((a) => a.id === id);
    if (!def) throw new Error(`first-week agent ${id} missing from registry`);
    const { name, job } = agentDisplay(def);
    return { id, name, job, tier: def.tier };
  });
}

/** Split the pack into agents this plan runs for real and agents it previews. */
export function splitByPlan(plan: PlanTier) {
  const all = firstWeekAgents();
  return {
    run: all.filter((a) => isPlanAtLeast(plan, a.tier as PlanTier)),
    locked: all.filter((a) => !isPlanAtLeast(plan, a.tier as PlanTier)),
  };
}

const plain = (s: string | null | undefined, fallback: string) => (s && s.trim() ? s.trim() : fallback);

/** Each agent's input for an unattended first run, built from the site brief. */
export function firstWeekInput(id: FirstWeekAgentId, b: SiteBrief, today = new Date()): Record<string, unknown> {
  const vp = plain(b.valueProposition, plain(b.metaDescription, b.hostname));
  const audience = plain(b.audience, "the people this site is for");
  const topic = plain(b.title, plain(b.h1, b.hostname));
  switch (id) {
    case "seo-audit":
      return { url: b.url, html: b.html, pageSpeed: null };
    case "page-cro":
      return { url: b.url, html: b.html, context: vp };
    case "copywriting":
      return {
        type: "headline",
        currentCopy: plain(b.h1, topic),
        goal: "more sign-ups from the homepage",
        context: vp,
        instructions: "Rewrite the homepage headline and subheadline. Give five options with a one-line reason each.",
      };
    case "social-content":
      return { topic: vp, count: 5, channels: "x, linkedin", tone: b.tone };
    case "keyword-research":
      return { seedKeyword: topic, count: 20, focus: `What ${audience} search for before buying` };
    case "email-sequence":
      return { type: "welcome", goal: "turn new sign-ups into active customers", context: vp, count: 5 };
    case "content-strategy":
      return { goal: "grow organic sign-ups", context: vp, timeHorizon: "90 days" };
    case "posting-plan":
      return {
        goals: "build an audience and drive sign-ups",
        context: vp,
        days: 7,
        startDate: today.toISOString().slice(0, 10),
        xPostsPerWeek: 5,
        linkedinPostsPerWeek: 3,
      };
    case "competitor-analysis":
      return {
        competitors: "",
        context: vp,
        focus: "Identify the three closest competitors from what the site sells, and how to stand apart from them.",
      };
    case "blog-post":
      return { topic: `A practical guide for ${audience}: ${vp}`, wordCount: 1200, tone: b.tone };
    case "growth-playbook":
      return {
        primaryGoal: "more sign-ups",
        currentSituation: vp,
        auditScore: b.seoScore ?? undefined,
        focus: "the next 90 days",
      };
    case "launch-strategy":
      return {
        product: vp,
        launchType: "relaunch",
        goals: "the first 100 paying customers",
        channels: "X, LinkedIn, email",
        teamSize: "a small team",
        budget: "low",
      };
    case "video-ad":
      return { topic: vp, brief: `A short ad for ${b.hostname} aimed at ${audience}.`, videoType: "ad", adLength: 30 };
    case "ab-test-setup":
      return {
        surface: "homepage headline",
        question: "Which headline gets more visitors to sign up?",
        hypothesis: `A headline that names the outcome for ${audience} will beat the current one.`,
      };
    case "programmatic-seo":
      return { seedQuery: topic, audience, count: 10 };
  }
}

/** A short, real preview of what an agent would produce for this site. */
export interface AgentPreview {
  agentId: FirstWeekAgentId;
  headline: string;
  items: string[];
}

/** Keep only well-formed previews for known agents; cap the lengths. */
export function normalizePreviews(raw: unknown): AgentPreview[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { previews?: unknown }).previews)
    ? (raw as { previews: unknown[] }).previews
    : [];
  const known = new Set<string>(FIRST_WEEK_AGENT_IDS);
  const seen = new Set<string>();
  const out: AgentPreview[] = [];
  for (const p of list) {
    if (!p || typeof p !== "object") continue;
    const { agentId, headline, items } = p as Record<string, unknown>;
    if (typeof agentId !== "string" || !known.has(agentId) || seen.has(agentId)) continue;
    if (typeof headline !== "string" || !headline.trim()) continue;
    seen.add(agentId);
    out.push({
      agentId: agentId as FirstWeekAgentId,
      headline: headline.trim().slice(0, 160),
      items: (Array.isArray(items) ? items : [])
        .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
        .slice(0, 4)
        .map((i) => i.trim().slice(0, 220)),
    });
  }
  // Registry order, so the page reads the same every time.
  return FIRST_WEEK_AGENT_IDS.flatMap((id) => out.filter((p) => p.agentId === id));
}

/** How many previews a signed-out visitor sees in full before the gate. */
export const OPEN_PREVIEWS = 2;
