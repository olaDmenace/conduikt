import type { SupabaseClient } from "@supabase/supabase-js";

// Insert (or no-op if idempotency_key already exists) a row in
// scheduled_executions. Caller passes a service-role client because the
// table only allows writes from service-role.

export interface EnqueueParams {
  userId: string;
  executionType: string;
  payload?: Record<string, unknown>;
  // Defaults to NOW() — i.e. "run on the next tick". Pass a future Date for
  // deferred execution.
  scheduledFor?: Date;
  // If set, a row with this idempotency_key already in the table = skip.
  // Use this so re-running an enrollment doesn't double-schedule the same
  // step.
  idempotencyKey?: string;
  // For UI grouping. e.g. parent_type='email_sequence_enrollment'.
  parentId?: string;
  parentType?: string;
  maxAttempts?: number;
}

export interface EnqueueResult {
  // true = newly inserted, false = no-op (idempotency hit).
  inserted: boolean;
  id: string | null;
}

export async function enqueueExecution(
  // SupabaseClient<any> because the project doesn't share a generated DB
  // type yet; the call sites are typed-tight.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: EnqueueParams
): Promise<EnqueueResult> {
  const row = {
    user_id: params.userId,
    execution_type: params.executionType,
    payload: params.payload ?? {},
    scheduled_for: (params.scheduledFor ?? new Date()).toISOString(),
    idempotency_key: params.idempotencyKey ?? null,
    parent_id: params.parentId ?? null,
    parent_type: params.parentType ?? null,
    max_attempts: params.maxAttempts ?? 3,
  };

  if (params.idempotencyKey) {
    // Two-step "insert or read": try to insert, if it conflicts on the
    // unique idempotency index, fetch the existing row instead. We don't
    // use upsert because we want to leave the existing row untouched.
    const { data, error } = await supabase
      .from("scheduled_executions")
      .insert(row)
      .select("id")
      .single();

    if (!error && data) {
      return { inserted: true, id: data.id };
    }
    // 23505 = unique_violation. Anything else is a real error.
    if (error && error.code === "23505") {
      const existing = await supabase
        .from("scheduled_executions")
        .select("id")
        .eq("idempotency_key", params.idempotencyKey)
        .maybeSingle();
      return { inserted: false, id: existing.data?.id ?? null };
    }
    throw new Error(`enqueueExecution failed: ${error?.message ?? "unknown"}`);
  }

  const { data, error } = await supabase
    .from("scheduled_executions")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`enqueueExecution failed: ${error?.message ?? "unknown"}`);
  }
  return { inserted: true, id: data.id };
}
