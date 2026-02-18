import type { ProjectContext } from "./skills/types";

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
}): ProjectContext {
  return {
    name: project.name,
    websiteUrl: project.website_url ?? "",
    description: project.description ?? undefined,
    targetAudience: project.target_audience as ProjectContext["targetAudience"],
    valueProposition: project.value_proposition ?? undefined,
    brandVoice: project.brand_voice as ProjectContext["brandVoice"],
    competitors: project.competitors as ProjectContext["competitors"],
    keywords: project.keywords as ProjectContext["keywords"],
  };
}
