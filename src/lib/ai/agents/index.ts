import { seoAuditSkill } from "./seo-audit";
import { pageCroSkill } from "./page-cro";
import { copywritingSkill } from "./copywriting";
import { socialContentSkill } from "./social-content";
import { emailSequenceSkill } from "./email-sequence";
import { contentStrategySkill } from "./content-strategy";
import { competitorAnalysisSkill } from "./competitor-analysis";
import { blogPostSkill } from "./blog-post";
import { keywordResearchSkill } from "./keyword-research";
import { growthPlaybookSkill } from "./growth-playbook";
import { onboardingAdvisorAgent } from "./onboarding-advisor";
import { videoScriptAgent } from "./video-script";
import { contentScorerAgent } from "./content-scorer";
import { programmaticSeoAgent } from "./programmatic-seo";
import { launchStrategyAgent } from "./launch-strategy";
import { abTestSetupAgent } from "./ab-test-setup";
import type { AgentConfig } from "./types";

export const agents: Record<string, AgentConfig> = {
  "seo-audit": seoAuditSkill,
  "page-cro": pageCroSkill,
  copywriting: copywritingSkill,
  "social-content": socialContentSkill,
  "email-sequence": emailSequenceSkill,
  "content-strategy": contentStrategySkill,
  "competitor-analysis": competitorAnalysisSkill,
  "blog-post": blogPostSkill,
  "keyword-research": keywordResearchSkill,
  "growth-playbook": growthPlaybookSkill,
  "onboarding-advisor": onboardingAdvisorAgent,
  "video-script": videoScriptAgent,
  "video-ad": videoScriptAgent,
  "content-scorer": contentScorerAgent,
  "programmatic-seo": programmaticSeoAgent,
  "launch-strategy": launchStrategyAgent,
  "ab-test-setup": abTestSetupAgent,
};

// Legacy alias
export const skills = agents;

export function getAgent(id: string): AgentConfig | undefined {
  return agents[id];
}

// Legacy alias
export const getSkill = getAgent;

export function listAgents(): Array<{ id: string; name: string; description: string }> {
  return Object.values(agents).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
  }));
}

// Legacy alias
export const listSkills = listAgents;

export type { AgentConfig, AgentOutput, ProjectContext, SkillConfig, SkillOutput } from "./types";
