import { seoAuditSkill } from "./seo-audit";
import { pageCroSkill } from "./page-cro";
import { copywritingSkill } from "./copywriting";
import { socialContentSkill } from "./social-content";
import { emailSequenceSkill } from "./email-sequence";
import { contentStrategySkill } from "./content-strategy";
import { competitorAnalysisSkill } from "./competitor-analysis";
import { blogPostSkill } from "./blog-post";
import { keywordResearchSkill } from "./keyword-research";
import type { SkillConfig } from "./types";

export const skills: Record<string, SkillConfig> = {
  "seo-audit": seoAuditSkill,
  "page-cro": pageCroSkill,
  copywriting: copywritingSkill,
  "social-content": socialContentSkill,
  "email-sequence": emailSequenceSkill,
  "content-strategy": contentStrategySkill,
  "competitor-analysis": competitorAnalysisSkill,
  "blog-post": blogPostSkill,
  "keyword-research": keywordResearchSkill,
};

export function getSkill(id: string): SkillConfig | undefined {
  return skills[id];
}

export function listSkills(): Array<{ id: string; name: string; description: string }> {
  return Object.values(skills).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));
}

export type { SkillConfig, ProjectContext, SkillOutput } from "./types";
