import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { normalizePlan } from "@/src/lib/plans";
import { dispatchWebhooks } from "@/src/lib/integrations/webhook-dispatch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownedProject = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Optional filters: ?type=growth_playbook&limit=5
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("type");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 100) : null;

  let query = supabase
    .from("assets")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (typeFilter) {
    // Callers filtering by type are in the "pick a saved one" flow
    // and should never see soft-deleted assets.
    query = query.eq("type", typeFilter).neq("status", "archived");
  }
  if (limit) query = query.limit(limit);

  const { data: assets, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(assets ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownedProject2 = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Block free-tier users from saving assets
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (normalizePlan(profile?.plan) === "free") {
    return NextResponse.json(
      { error: "Saving assets requires a Pro plan or higher.", code: "PLAN_GATED" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { type, channel, title, content } = body;

  // Validate asset type against DB constraint
  const validTypes = [
    "landing_page",
    "email",
    "social_post",
    "seo_page",
    "meta_tags",
    "copy_block",
    "cta",
    "headline",
    "ad_copy",
    "schema_markup",
    "audit_report",
    "blog_post",
    "growth_playbook",
    "launch_plan",
  ];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid asset type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const validChannels = ["x", "linkedin", "email", "web", "google_ads", "meta_ads"];
  if (channel && !validChannels.includes(channel)) {
    return NextResponse.json(
      { error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      project_id: id,
      type,
      channel: channel || null,
      title: title || null,
      content: content || {},
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  dispatchWebhooks(user.id, id, {
    event: "content.saved",
    title: title || `${type} asset saved`,
    content: typeof content === "string" ? content : JSON.stringify(content).slice(0, 2000),
    contentType: type,
    metadata: { assetId: asset.id, channel },
  }).catch(() => {});

  return NextResponse.json(asset, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await request.json();
  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  // Verify ownership via project
  const { data: asset } = await supabase
    .from("assets")
    .select("id, project_id")
    .eq("id", assetId)
    .eq("project_id", id)
    .single();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Soft-delete by archiving
  const { error } = await supabase
    .from("assets")
    .update({ status: "archived" })
    .eq("id", assetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
