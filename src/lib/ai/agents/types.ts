import type { AIModel } from "../client";

export interface ProjectContext {
  websiteUrl: string;
  name: string;
  description?: string;
  industry?: string;
  targetAudience?: {
    personas: string[];
    pain_points: string[];
  };
  valueProposition?: string;
  brandVoice?: {
    tone: string;
    dos: string[];
    donts: string[];
  };
  competitors?: Array<{
    name: string;
    url: string;
    strengths: string[];
  }>;
  keywords?: Array<{
    term: string;
    volume?: number;
    difficulty?: number;
  }>;
  performanceContext?: string;
  // From profiles.brand_primary_color (default #D4956A). Surfaced into
  // agents that generate styled content (email sequences, blog posts,
  // CRO copy) so CTAs / accents match the user's Brand Kit.
  brandPrimaryColor?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: AIModel;
  maxTokens: number;
  buildSystemPrompt: (context: ProjectContext) => string;
  buildUserPrompt: (input: Record<string, unknown>) => string;
  parseResponse: (response: string) => AgentOutput;
}

export interface AgentOutput {
  type: string;
  data: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Legacy aliases for backward compatibility during migration
export type SkillConfig = AgentConfig;
export type SkillOutput = AgentOutput;
