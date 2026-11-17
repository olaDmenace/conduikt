import type { AIModel } from "./client";
import type { PlanTier } from "@/src/lib/plans";

// Which model does which job, and how hard it thinks. Previews and scoring
// are short, structured and run often (every signed-out site check, every
// content score), so they go to the cheap model at low effort. Real agent
// output and the performance analyzer stay on the default model at medium
// effort. All four can be overridden per deploy:
//   AI_MODEL_DEFAULT   the model agents generate with (default claude-opus-5-5)
//   AI_MODEL_CHEAP     the model previews and scores use (default claude-haiku-5-5)
//   AI_EFFORT_DEFAULT  effort for generate / analyze (default medium)
//   AI_EFFORT_CHEAP    effort for preview / score (default low)
// An override that is not a known model id or effort level is ignored with
// one warning, so a typo in the env falls back to the defaults instead of
// sending a request the API rejects. The legacy 4.x ids count as unknown
// here on purpose: every request carries output_config.effort, which Haiku
// 4.5 rejects outright and Opus/Sonnet 4.6 reject at "xhigh", so letting
// them through would 400 every call. They stay in MODEL_PRICING only so old
// ai_generations rows are still costed at what they were billed.

export type ModelPurpose = "preview" | "score" | "analyze" | "generate";

/**
 * Thinking depth on the 5.5 models (`output_config.effort`). Thinking is
 * adaptive and always on; effort is the only knob. "xhigh" is accepted by
 * the API but not yet typed by SDK 0.74, so the client narrows it on send.
 */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** The model everything used before routing existed; generateWithClaude's default. */
export const DEFAULT_MODEL: AIModel = "claude-opus-5-5";
export const CHEAP_MODEL: AIModel = "claude-haiku-5-5";

export const DEFAULT_EFFORT: Effort = "medium";
export const CHEAP_EFFORT: Effort = "low";

// Every id the AIModel union allows, i.e. every id a request may target.
// Typed as a Record so adding an id to the union without listing it here is
// a compile error.
const KNOWN_MODELS: Record<AIModel, true> = {
  "claude-opus-5-5": true,
  "claude-sonnet-5-5": true,
  "claude-haiku-5-5": true,
};

const KNOWN_EFFORTS: Record<Effort, true> = { low: true, medium: true, high: true, xhigh: true, max: true };

export function isAIModel(value: unknown): value is AIModel {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(KNOWN_MODELS, value);
}

export function isEffort(value: unknown): value is Effort {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(KNOWN_EFFORTS, value);
}

const CHEAP_PURPOSES: ReadonlySet<ModelPurpose> = new Set(["preview", "score"]);

// One warning per bad env value per process; modelFor runs on every request.
const warned = new Set<string>();

/** Tests only: forget which bad env values have already been warned about. */
export function resetModelRoutingWarnings() {
  warned.clear();
}

function envValue<T extends string>(name: string, isValid: (v: unknown) => v is T, what: string): T | null {
  const v = process.env[name]?.trim();
  if (!v) return null;
  if (isValid(v)) return v;
  const key = `${name}=${v}`;
  if (!warned.has(key)) {
    warned.add(key);
    console.warn(`[model-routing] ${name}="${v}" is not a known ${what}; using the default.`);
  }
  return null;
}

/**
 * Pick the model for a purpose. `plan` is accepted so callers can pass
 * what they know; every plan gets the same routing today.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function modelFor(purpose: ModelPurpose, plan?: PlanTier): AIModel {
  if (CHEAP_PURPOSES.has(purpose)) return envValue("AI_MODEL_CHEAP", isAIModel, "model id") ?? CHEAP_MODEL;
  return envValue("AI_MODEL_DEFAULT", isAIModel, "model id") ?? DEFAULT_MODEL;
}

/** How hard the model should think for a purpose; see Effort. */
export function effortFor(purpose: ModelPurpose): Effort {
  if (CHEAP_PURPOSES.has(purpose)) return envValue("AI_EFFORT_CHEAP", isEffort, "effort level") ?? CHEAP_EFFORT;
  return envValue("AI_EFFORT_DEFAULT", isEffort, "effort level") ?? DEFAULT_EFFORT;
}

// USD per million tokens. ai_generations stores tokens, not cost, so the
// daily spend cap and the admin usage page both estimate from this table.
// Keyed by string, not AIModel, because legacy rows stay so old generations
// are still priced at what they cost even though those ids can no longer be
// sent. Unknown model ids are priced as Opus 5.5, the dearest current model,
// which errs high. (Haiku 5.5 is $0.10/$0.50 only for prompts up to 100K
// tokens; nothing here sends more.)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** What an id we have never heard of is billed at: the dearest current model. */
export const FALLBACK_PRICING_MODEL = "claude-opus-5-5";

/**
 * The current models with their list prices, for display (the admin usage
 * page footnote). Derived from MODEL_PRICING so the caption cannot drift
 * from the numbers it sits beside.
 */
export const CURRENT_MODEL_PRICING: ReadonlyArray<{ id: AIModel; label: string; input: number; output: number }> = (
  [
    ["claude-opus-5-5", "Opus 5.5"],
    ["claude-sonnet-5-5", "Sonnet 5.5"],
    ["claude-haiku-5-5", "Haiku 5.5"],
  ] as const
).map(([id, label]) => ({ id, label, ...MODEL_PRICING[id] }));

export function estimateCostUsd(model: string | null | undefined, inputTokens: number, outputTokens: number): number {
  const pricing = (model && MODEL_PRICING[model]) || MODEL_PRICING[FALLBACK_PRICING_MODEL];
  return ((inputTokens || 0) * pricing.input + (outputTokens || 0) * pricing.output) / 1_000_000;
}
