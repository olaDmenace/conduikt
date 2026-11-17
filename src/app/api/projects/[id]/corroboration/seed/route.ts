import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { defaultTasksFor } from "@/src/lib/corroboration/tasks";

// POST /api/projects/{id}/corroboration/seed
// Creates the default task list for the project's business type. Safe to
// call again: existing (project, platform) rows are left as they are, so
// ticked tasks stay ticked.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  const defs = defaultTasksFor(ctx.project.business_type);
  const rows = defs.map((d) => ({
    project_id: id,
    platform: d.platform,
    title: d.title,
    url: d.url,
  }));

  const { error } = await ctx.supabase
    .from("corroboration_tasks")
    .upsert(rows, { onConflict: "project_id,platform", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = await ctx.supabase
    .from("corroboration_tasks")
    .select("id, platform, title, url, status, mentioned, checked_at, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ seeded: rows.length, tasks: data ?? [] }, { status: 201 });
}
