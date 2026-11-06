// Sample output for when the writing service can't be reached. One JSON
// per first-week agent, in the exact shape normalizePreviews accepts, and
// one site audit. All of it is written for a generic small local business
// and is marked `sample: true` everywhere it is shown, so nobody mistakes
// it for a result about their own site.

import type { MagicAuditResult } from "@/src/lib/onboarding/magic-audit";
import { normalizePreviews, type AgentPreview, type FirstWeekAgentId } from "@/src/lib/first-week/plan";
import abTestSetup from "./ab-test-setup.json";
import blogPost from "./blog-post.json";
import competitorAnalysis from "./competitor-analysis.json";
import contentStrategy from "./content-strategy.json";
import copywriting from "./copywriting.json";
import emailSequence from "./email-sequence.json";
import growthPlaybook from "./growth-playbook.json";
import keywordResearch from "./keyword-research.json";
import launchStrategy from "./launch-strategy.json";
import pageCro from "./page-cro.json";
import postingPlan from "./posting-plan.json";
import programmaticSeo from "./programmatic-seo.json";
import seoAudit from "./seo-audit.json";
import socialContent from "./social-content.json";
import videoAd from "./video-ad.json";
import magicAudit from "./magic-audit.json";

export type SampleAgentPreview = AgentPreview & { sample: true };
export type SampleMagicAudit = MagicAuditResult & { sample: true };

export const SAMPLE_PREVIEWS: ReadonlyArray<{ agentId: string; headline: string; items: string[] }> = [
  seoAudit,
  socialContent,
  keywordResearch,
  copywriting,
  pageCro,
  emailSequence,
  contentStrategy,
  postingPlan,
  competitorAnalysis,
  blogPost,
  growthPlaybook,
  launchStrategy,
  videoAd,
  abTestSetup,
  programmaticSeo,
];

/** Sample previews for the given agents, in registry order, each flagged as a sample. */
export function samplePreviews(agentIds: readonly FirstWeekAgentId[]): SampleAgentPreview[] {
  const wanted = new Set<string>(agentIds);
  return normalizePreviews(SAMPLE_PREVIEWS.filter((p) => wanted.has(p.agentId))).map((p) => ({ ...p, sample: true as const }));
}

/** A sample site audit. The url is accepted for parity with the real call; the content is generic on purpose. */
export function sampleMagicAudit(url: string): SampleMagicAudit {
  void url;
  const a = magicAudit as MagicAuditResult;
  return {
    seoScore: a.seoScore,
    seoGrade: a.seoGrade,
    topIssues: [...a.topIssues],
    brandVoice: { ...a.brandVoice },
    sampleLinkedInPosts: a.sampleLinkedInPosts.map((p) => ({ ...p })),
    sample: true,
  };
}
