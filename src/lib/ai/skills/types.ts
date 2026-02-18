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
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  model: AIModel;
  maxTokens: number;
  buildSystemPrompt: (context: ProjectContext) => string;
  buildUserPrompt: (input: Record<string, unknown>) => string;
  parseResponse: (response: string) => SkillOutput;
}

export interface SkillOutput {
  type: string;
  data: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
