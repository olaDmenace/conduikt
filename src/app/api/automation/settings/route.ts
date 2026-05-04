import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

const VALID_MODES = new Set(["off", "review", "auto"]);

// Returns the user's automation settings, creating a default row on
// first read so the UI doesn't have to handle "missing row" everywhere.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("automation_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json(existing);

  // First-touch: insert defaults so subsequent reads/writes are uniform.
  const { data: created, error } = await supabase
    .from("automation_settings")
    .insert({ user_id: user.id })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(created);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("x_mode" in body) {
    if (!VALID_MODES.has(String(body.x_mode))) {
      return NextResponse.json({ error: "Invalid x_mode" }, { status: 400 });
    }
    update.x_mode = body.x_mode;
  }
  if ("linkedin_mode" in body) {
    if (!VALID_MODES.has(String(body.linkedin_mode))) {
      return NextResponse.json({ error: "Invalid linkedin_mode" }, { status: 400 });
    }
    update.linkedin_mode = body.linkedin_mode;
  }
  if ("review_hold_hours" in body) {
    const n = Number(body.review_hold_hours);
    if (!Number.isFinite(n) || n < 1 || n > 168) {
      return NextResponse.json(
        { error: "review_hold_hours must be between 1 and 168" },
        { status: 400 }
      );
    }
    update.review_hold_hours = Math.round(n);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Upsert in case the row doesn't exist yet (PATCH-as-create is friendly
  // for first-time settings page visit).
  const { data, error } = await supabase
    .from("automation_settings")
    .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
