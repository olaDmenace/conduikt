import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { availableEngines } from "@/src/lib/integrations/ai-visibility";
import { taskDefFor } from "@/src/lib/corroboration/tasks";

// GET /api/projects/{id}/corroboration
// The project's "get mentioned" list with each task's one-line reason,
// plus whether an answer engine is available for the "mentioned?" check.
// Empty until POST .../corroboration/seed has run.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  const { data, error } = await ctx.supabase
    .from("corroboration_tasks")
    .select("id, platform, title, url, status, mentioned, checked_at, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = (data ?? []).map((row) => ({
    ...row,
    why: taskDefFor(row.platform as string)?.why ?? null,
  }));

  return NextResponse.json({
    tasks,
    engineAvailable: availableEngines().length > 0,
    lastCheckedAt: tasks.reduce<string | null>((latest, t) => {
      const at = t.checked_at as string | null;
      return at && (!latest || at > latest) ? at : latest;
    }, null),
  });
}
