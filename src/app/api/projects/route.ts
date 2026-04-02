import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      name,
      website_url,
      description,
      created_at,
      updated_at,
      audits(id, score, type),
      assets(id),
      campaigns(id)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Shape the response to include counts
  const shaped = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    website_url: p.website_url,
    description: p.description,
    created_at: p.created_at,
    updated_at: p.updated_at,
    lastAuditScore:
      p.audits && p.audits.length > 0
        ? p.audits[p.audits.length - 1].score
        : null,
    assetsCount: p.assets?.length ?? 0,
    campaignsCount: p.campaigns?.length ?? 0,
  }));

  return NextResponse.json(shaped);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    website_url,
    description,
    onboarding_answers,
    target_audience,
    value_proposition,
  } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: name.trim(),
      website_url: website_url || null,
      description: description || null,
      onboarding_answers: onboarding_answers || null,
      target_audience: target_audience || null,
      value_proposition: value_proposition || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
