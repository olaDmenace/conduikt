import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { MoveStageSchema, STAGE_LABELS } from "@/src/lib/leads/stages";

// PATCH /api/projects/[id]/leads/[contactId]  body: { stage }
// Moves a lead to another pipeline stage. The contact must belong to one
// of this project's subscriber lists.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const { id, contactId } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Send the new stage as JSON", code: "INVALID_INPUT" }, { status: 400 });
  }
  const parsed = MoveStageSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Stage must be one of: ${Object.values(STAGE_LABELS).join(", ")}`, field: "stage", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }
  const { stage } = parsed.data;

  const { data: contact } = await supabase
    .from("audience_contacts")
    .select("id, audience_id, pipeline_stage, stage_changed_at")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: audience } = await supabase
    .from("audiences")
    .select("id")
    .eq("id", contact.audience_id)
    .eq("project_id", id)
    .maybeSingle();
  if (!audience) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const changed = contact.pipeline_stage !== stage;
  const stageChangedAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("audience_contacts")
    .update(changed ? { pipeline_stage: stage, stage_changed_at: stageChangedAt } : { pipeline_stage: stage })
    .eq("id", contactId)
    .select("id, pipeline_stage, stage_changed_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: updated?.id ?? contactId,
    stage: updated?.pipeline_stage ?? stage,
    stage_changed_at: updated?.stage_changed_at ?? (changed ? stageChangedAt : contact.stage_changed_at ?? null),
  });
}
