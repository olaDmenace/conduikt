// The five pipeline stages a lead moves through. Mirrors the CHECK
// constraint on audience_contacts.pipeline_stage in
// supabase/migrations/20261117_business_details_leads.sql; change both.

import { z } from "zod";

export const PIPELINE_STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PipelineStageSchema = z.enum(PIPELINE_STAGES);

/** Body of PATCH /api/projects/[id]/leads/[contactId]. */
export const MoveStageSchema = z.object({
  stage: PipelineStageSchema,
});

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export function isPipelineStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && (PIPELINE_STAGES as readonly string[]).includes(value);
}

/** Rows written before the column existed, or anything odd, read as "new". */
export function normalizeStage(value: unknown): PipelineStage {
  return isPipelineStage(value) ? value : "new";
}
