import type { AIModel } from "./client";
import type { PlanTier } from "@/src/lib/plans";

// Which model does which job. Previews and scoring are short, structured
// and run often (every signed-out site check, every content score), so
// they go to the cheap model. Real agent output and the performance
// analyzer stay on the default. Both ids can be overridden per deploy:
//   AI_MODEL_DEFAULT  the model agents generate with (default sonnet)
//   AI_MODEL_CHEAP    the model previews and scores use (default haiku)

export type ModelPurpose = "preview" | "score" | "analyze" | "generate";

/** The model everything used before routing existed; generateWithClaude's default. */
export const DEFAULT_MODEL: AIModel = "claude-sonnet-4-6";
export const CHEAP_MODEL: AIModel = "claude-haiku-4-5";

const CHEAP_PURPOSES: ReadonlySet<ModelPurpose> = new Set(["preview", "score"]);

function envModel(name: "AI_MODEL_DEFAULT" | "AI_MODEL_CHEAP"): AIModel | null {
  const v = process.env[name]?.trim();
  return v ? (v as AIModel) : null;
}

/**
 * Pick the model for a purpose. `plan` is accepted so callers can pass
 * what they know; every plan gets the same routing today.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function modelFor(purpose: ModelPurpose, plan?: PlanTier): AIModel {
  if (CHEAP_PURPOSES.has(purpose)) return envModel("AI_MODEL_CHEAP") ?? CHEAP_MODEL;
  return envModel("AI_MODEL_DEFAULT") ?? DEFAULT_MODEL;
}

// USD per million tokens. ai_generations stores tokens, not cost, so the
// daily spend cap and the admin usage page both estimate from this table.
// Unknown model ids are priced as the default model, which errs high.
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(model: string | null | undefined, inputTokens: number, outputTokens: number): number {
  const pricing = (model && MODEL_PRICING[model]) || MODEL_PRICING[DEFAULT_MODEL];
  return ((inputTokens || 0) * pricing.input + (outputTokens || 0) * pricing.output) / 1_000_000;
}
