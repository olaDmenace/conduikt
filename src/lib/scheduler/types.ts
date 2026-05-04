// Types for the generic execution scheduler.
//
// An "execution" is one unit of background work (one email step, one
// playbook action, etc.) that lives in scheduled_executions and is
// dispatched by /api/cron/scheduler-tick to a handler registered for
// its execution_type.

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ScheduledExecution {
  id: string;
  user_id: string;
  execution_type: string;
  payload: Record<string, unknown>;
  scheduled_for: string;
  status: ExecutionStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  idempotency_key: string | null;
  parent_id: string | null;
  parent_type: string | null;
  result: Record<string, unknown> | null;
  ran_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type HandlerSuccess = {
  ok: true;
  result?: Record<string, unknown>;
};

export type HandlerFailure = {
  ok: false;
  error: string;
  // retryable=false short-circuits retries (e.g., "audience deleted") so we
  // don't burn attempts on something that can't recover.
  retryable?: boolean;
};

export type HandlerResult = HandlerSuccess | HandlerFailure;

// Handlers receive a service-role supabase client because they run from cron
// without a user session.
export interface HandlerContext {
  execution: ScheduledExecution;
  supabase: ReturnType<typeof import("../supabase/service").createServiceClient>;
}

export type ExecutionHandler = (
  payload: Record<string, unknown>,
  context: HandlerContext
) => Promise<HandlerResult>;
