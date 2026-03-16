import type { ProjectContext } from "./agents/types";

/**
 * Builds a ProjectContext from a database project record.
 */
export function buildProjectContext(project: {
  name: string;
  website_url: string | null;
  description: string | null;
  target_audience: unknown;
  value_proposition: string | null;
  brand_voice: unknown;
  competitors: unknown;
  keywords: unknown;
  industry?: string | null;
  business_description?: string | null;
  audience_pain_point?: string | null;
  online_channels?: string[] | null;
  brand_voice_example?: string | null;
  primary_goal?: string | null;
}): ProjectContext {
  // Use onboarding industry column if available, else fall back to existing fields
  const description =
    project.business_description || project.description || undefined;

  // Resolve target audience — could be the new flat string or the legacy object
  let targetAudience = project.target_audience as ProjectContext["targetAudience"];
  if (typeof project.target_audience === "string" && project.target_audience) {
    targetAudience = {
      personas: [project.target_audience],
      pain_points: project.audience_pain_point
        ? [project.audience_pain_point]
        : [],
    };
  }

  // Resolve brand voice — could be the new flat string or legacy object
  let brandVoice = project.brand_voice as ProjectContext["brandVoice"];
  if (typeof project.brand_voice === "string" && project.brand_voice) {
    brandVoice = {
      tone: project.brand_voice,
      dos: project.brand_voice_example ? [project.brand_voice_example] : [],
      donts: [],
    };
  }

  return {
    name: project.name,
    websiteUrl: project.website_url ?? "",
    description,
    industry: project.industry ?? undefined,
    targetAudience,
    valueProposition: project.value_proposition ?? undefined,
    brandVoice,
    competitors: project.competitors as ProjectContext["competitors"],
    keywords: project.keywords as ProjectContext["keywords"],
  };
}
