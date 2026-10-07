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

export function agentDisplay(agent: Pick<AgentDefinition, "id" | "shortName" | "description">): AgentDisplay {
  return AGENT_DISPLAY[agent.id] ?? { name: agent.shortName, job: agent.description };
}

export function agentsInGroup(category: AgentDefinition["category"]): AgentDefinition[] {
  return AGENT_REGISTRY.filter((a) => a.category === category);
}
