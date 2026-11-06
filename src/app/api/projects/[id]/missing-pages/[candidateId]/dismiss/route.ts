import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";

// POST: "Dismiss". The phrase stays in the table as dismissed so a later
// run does not bring it back.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  const { data, error } = await ctx.supabase
    .from("missing_page_candidates")
    .update({ status: "dismissed" })
    .eq("id", candidateId)
    .eq("project_id", id)
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ dismissed: true });
}
