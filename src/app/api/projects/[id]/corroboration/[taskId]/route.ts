import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";

// PATCH /api/projects/{id}/corroboration/{taskId}  { status: "todo" | "done" | "skipped" }
// The owner ticking a listing off (or skipping one that does not apply).

const PatchSchema = z.object({
  status: z.enum(["todo", "done", "skipped"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  if (!z.uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "status must be todo, done or skipped" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("corroboration_tasks")
    .update({ status: parsed.data.status })
    .eq("id", taskId)
    .eq("project_id", id)
    .select("id, platform, title, url, status, mentioned, checked_at, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ task: data });
}
