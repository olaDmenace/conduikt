import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { z } from "zod";

/**
 * GET /api/assets/[assetId]/revisions
 *   List recent revisions for an asset, newest first. Enforces RLS via
 *   the shared client so a caller who doesn't own the asset receives
 *   an empty result (Supabase collapses the join at the policy layer).
 *
 * POST /api/assets/[assetId]/revisions
 *   Create a new revision snapshot. Client responsibility: call this
 *   after any successful save/edit so the timeline stays in sync.
 *
 * The route enforces a soft cap of 50 revisions per asset — older
 * rows are pruned in the POST handler after each insert. Keeps the
 * timeline focused on recent history without a background cron.
 */

const MAX_REVISIONS_PER_ASSET = 50;

const CreateSchema = z.object({
  content: z.unknown(),
  source: z.enum(["generation", "manual_edit", "autosave", "restore"]),
});

interface RouteContext {
  params: Promise<{ assetId: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { assetId } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("content_revisions")
    .select("id, source, created_at, content")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(MAX_REVISIONS_PER_ASSET);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revisions: data ?? [] });
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { assetId } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = CreateSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid revision payload", detail: String(err) },
      { status: 400 }
    );
  }

  // Insert. RLS enforces asset ownership — a user not owning the asset
  // will get a permission error at the row level, not a 200.
  const { data: inserted, error: insertErr } = await supabase
    .from("content_revisions")
    .insert({
      asset_id: assetId,
      content: parsed.content,
      source: parsed.source,
    })
    .select("id, source, created_at, content")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: insertErr.message },
      { status: 500 }
    );
  }

  // Prune: keep only the 50 most recent revisions per asset. Uses a
  // subquery to find rows beyond the cutoff. Best-effort — a failure
  // to prune shouldn't fail the user's save.
  const { data: keepers } = await supabase
    .from("content_revisions")
    .select("id")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(MAX_REVISIONS_PER_ASSET);

  if (keepers && keepers.length === MAX_REVISIONS_PER_ASSET) {
    const keeperIds = keepers.map((k) => k.id);
    await supabase
      .from("content_revisions")
      .delete()
      .eq("asset_id", assetId)
      .not("id", "in", `(${keeperIds.map((id) => `'${id}'`).join(",")})`);
  }

  return NextResponse.json({ revision: inserted }, { status: 201 });
}
