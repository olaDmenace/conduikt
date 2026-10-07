// User-facing agent names and one-line jobs — docs/DESIGN.md §"Agent
// names as the user sees them". Registry keys and ids stay untouched;
// every surface that shows an agent to a user reads its label from here,
// so the plain-words rename happens in one place.

import { AGENT_REGISTRY, type AgentDefinition } from "./registry";

export interface AgentDisplay {
  name: string;
  job: string;
}

export const AGENT_DISPLAY: Record<string, AgentDisplay> = {
  "seo-audit": { name: "Site Audit", job: "Finds what to fix on your website" },
  "page-cro": { name: "Conversion Check", job: "Finds why visitors don't sign up" },
  "competitor-analysis": { name: "Competitor Watch", job: "Sees what rivals are doing" },
  "ab-test-setup": { name: "Split Test", job: "Tries two versions, keeps the winner" },
  "client-reports": { name: "Client Reports", job: "Reports you can send to clients" },
  copywriting: { name: "Copywriter", job: "Headlines and page copy" },
  "social-content": { name: "Social", job: "Writes posts for X and LinkedIn" },
  "email-sequence": { name: "Email", job: "Welcome and follow-up emails" },
  "blog-post": { name: "Blog", job: "Full articles, ready to publish" },
  "video-ad": { name: "Video Ad", job: "Short video ads with a voice" },
  "programmatic-seo": { name: "Landing Pages", job: "Many search pages at once" },
  "content-strategy": { name: "Strategy", job: "Your plan for the next 90 days" },
  "posting-plan": { name: "Posting Plan", job: "What to post, and when" },
  "keyword-research": { name: "Keyword Finder", job: "Finds what people search for" },
  "growth-playbook": { name: "Growth Plan", job: "Ideas to get more signups" },
  "launch-strategy": { name: "Launch Plan", job: "A step-by-step launch week" },
  campaigns: { name: "Campaign", job: "Chains agents into one run" },
  calendar: { name: "Calendar", job: "Schedules everything" },
};

/** The four "Ask an agent to" groups, in rail order. */
export const AGENT_GROUPS: Array<{
  category: AgentDefinition["category"];
  label: string;
}> = [
  { category: "analysis", label: "Check my site" },
  { category: "strategy", label: "Plan what to say" },
  { category: "creation", label: "Write something" },
  { category: "distribution", label: "Post and schedule" },
];

// ---------------------------------------------------------------------
// The real agent count (audited Oct 2026).
// Every registry entry opens something, but two of them are tools, not
// AI agents: Calendar is a scheduler over scheduled_posts and Client
// Reports renders PDFs from existing audit data — neither calls a model.
// Campaign IS an agent: it runs other agents in sequence through Claude.
// Every public claim ("16 AI agents") must come from here, never a
// hard-coded number.
// ---------------------------------------------------------------------
const TOOL_IDS = new Set(["calendar", "client-reports"]);

export const AI_AGENTS: AgentDefinition[] = AGENT_REGISTRY.filter((a) => !TOOL_IDS.has(a.id));
export const TOOLS: AgentDefinition[] = AGENT_REGISTRY.filter((a) => TOOL_IDS.has(a.id));
export const AI_AGENT_COUNT = AI_AGENTS.length;

export function isTool(id: string): boolean {
  return TOOL_IDS.has(id);
}

const TIER_RANK = { free: 0, pro: 1, growth: 2, agency: 3 } as const;

/** AI agents unlocked at a plan tier (tools excluded). */
export function aiAgentCountForTier(tier: AgentDefinition["tier"]): number {
  return AI_AGENTS.filter((a) => TIER_RANK[a.tier] <= TIER_RANK[tier]).length;
}

/** Tools unlocked at a plan tier, as display names. */
export function toolsForTier(tier: AgentDefinition["tier"]): string[] {
  return TOOLS.filter((a) => TIER_RANK[a.tier] <= TIER_RANK[tier]).map((a) => agentDisplay(a).name);
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
/** "Sixteen" for headline copy; falls back to digits past twenty. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function agentDisplay(agent: Pick<AgentDefinition, "id" | "shortName" | "description">): AgentDisplay {
  return AGENT_DISPLAY[agent.id] ?? { name: agent.shortName, job: agent.description };
}

export function agentsInGroup(category: AgentDefinition["category"]): AgentDefinition[] {
  return AGENT_REGISTRY.filter((a) => a.category === category);
}
