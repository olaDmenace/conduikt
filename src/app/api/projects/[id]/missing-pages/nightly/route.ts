import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";

// PATCH { enabled: boolean }: the nightly opt-in. When on, the 2am Inngest
// job writes one page a night into Drafts (or live, for Hands off).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  const body = (await request.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Send { enabled: true } or { enabled: false }" }, { status: 400 });

  const { error } = await ctx.supabase.from("projects").update({ missing_pages_enabled: body.enabled }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled: body.enabled });
}
