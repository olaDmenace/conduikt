import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

// GET /api/automation/queue
// Returns pending playbook_action executions for the current user, with
// the linked asset's title + scheduled_text so the queue UI can show
// what's about to publish.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows } = await supabase
    .from("scheduled_executions")
    .select("id, payload, scheduled_for, status, attempts, last_error, created_at")
    .eq("user_id", user.id)
    .eq("execution_type", "playbook_action")
    .in("status", ["pending", "running"])
    .order("scheduled_for", { ascending: true })
    .limit(100);

  const items = rows ?? [];
  if (items.length === 0) return NextResponse.json([]);

  // Attach asset previews. Using a small N+1 here is fine — queues are
  // typically <50 items and each lookup is keyed by id.
  const enriched = await Promise.all(
    items.map(async (row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const assetId =
        typeof payload.assetId === "string" ? payload.assetId : null;
      let asset: { id: string; title: string | null; content: unknown } | null =
        null;
      if (assetId) {
        const { data } = await supabase
          .from("assets")
          .select("id, title, content")
          .eq("id", assetId)
          .maybeSingle();
        asset = data;
      }
      return { ...row, asset, channel: payload.channel ?? null };
    })
  );

  return NextResponse.json(enriched);
}
