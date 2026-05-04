import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { createAudience } from "@/src/lib/email/marketing";
import { checkAudienceLimit, getUserPlan } from "@/src/lib/email/usage";

// GET /api/projects/[id]/audiences — list audiences for this project.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("audiences")
    .select(
      "id, name, description, resend_audience_id, created_at, updated_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with contact counts so the list UI can show "X contacts" without
  // a per-row fetch.
  const ids = (data ?? []).map((a) => a.id);
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: contactRows } = await supabase
      .from("audience_contacts")
      .select("audience_id, status")
      .in("audience_id", ids)
      .eq("status", "subscribed");
    for (const r of contactRows ?? []) {
      counts[r.audience_id] = (counts[r.audience_id] ?? 0) + 1;
    }
  }

  return NextResponse.json(
    (data ?? []).map((a) => ({ ...a, contact_count: counts[a.id] ?? 0 }))
  );
}

// POST /api/projects/[id]/audiences — create a new audience for this project.
// Body: { name: string, description?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Plan-gating: how many audiences does this user already have?
  const plan = await getUserPlan(supabase, user.id);
  const limit = await checkAudienceLimit(supabase, user.id, plan);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Audience limit reached (${limit.used}/${limit.limit} on your plan). Upgrade to add more.`,
        code: "PLAN_GATED",
        limits: limit,
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : null;

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }
  if (name.length > 200) {
    return NextResponse.json(
      { error: "name must be 200 characters or fewer" },
      { status: 400 }
    );
  }

  // Mirror in Resend first. If Resend create fails we never write the
  // Conduikt row — keeps DB and Resend in lockstep.
  const resend = await createAudience(name);
  if (!resend.ok) {
    return NextResponse.json(
      { error: `Failed to create audience in Resend: ${resend.error}` },
      { status: 502 }
    );
  }

  const { data, error } = await supabase
    .from("audiences")
    .insert({
      project_id: projectId,
      user_id: user.id,
      name,
      description,
      resend_audience_id: resend.data.id,
    })
    .select(
      "id, name, description, resend_audience_id, created_at, updated_at"
    )
    .single();

  if (error) {
    // Conduikt-side write failed after Resend created the audience. Try to
    // roll back the Resend side; the user can retry.
    return NextResponse.json(
      {
        error: error.message,
        warning:
          "Audience was created in Resend but the Conduikt record failed. Please retry.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...data, contact_count: 0 }, { status: 201 });
}
