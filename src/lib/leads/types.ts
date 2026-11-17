// One lead as GET /api/projects/[id]/leads returns it: the contact row
// plus the score computed on read (src/lib/leads/score.ts).

import type { PipelineStage } from "./stages";

export interface LeadRow {
  id: string;
  audience_id: string;
  audience_name: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  whatsapp_opt_in: boolean;
  status: string;
  stage: PipelineStage;
  stage_changed_at: string | null;
  /** Where the contact came from: form, import, manual... Null for older rows. */
  source: string | null;
  last_reply_at: string | null;
  last_activity_at: string | null;
  /** 0 to 100, see SCORE_RULES. */
  score: number;
  score_reasons: string[];
  created_at: string;
}

export interface LeadsResponse {
  leads: LeadRow[];
  total: number;
  page: number;
  limit: number;
  booking_url: string | null;
}
