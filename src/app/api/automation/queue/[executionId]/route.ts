import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";

// PATCH /api/automation/queue/[executionId]
// Body: { action: 'cancel' | 'publish_now' }
//
// - 'cancel'      — flips status to 'cancelled' so the cron skips it.
// - 'publish_now' — moves scheduled_for to NOW so the next tick fires.
//
// We use the user-scoped client to verify ownership (RLS), then the
// service client to do the actual update (since scheduled_executions
// is service-role-only for writes).

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "cancel" && body.action !== "publish_now") {
    return NextResponse.json(
      { error: "action must be 'cancel' or 'publish_now'" },
      { status: 400 }
    );
  }

  // Verify the row belongs to this user via the RLS-scoped client.
  const { data: existing } = await supabase
    .from("scheduled_executions")
    .select("id, status, execution_type")
    .eq("id", executionId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.execution_type !== "playbook_action") {
    return NextResponse.json(
      { error: "Only playbook_action executions can be controlled here" },
      { status: 400 }
    );
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Execution is in '${existing.status}' status — cannot modify` },
      { status: 409 }
    );
  }

  const service = createServiceClient();
  const update =
    body.action === "cancel"
      ? { status: "cancelled" }
      : { scheduled_for: new Date().toISOString() };

  const { data, error } = await service
    .from("scheduled_executions")
    .update(update)
    .eq("id", executionId)
    .select("id, status, scheduled_for")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
