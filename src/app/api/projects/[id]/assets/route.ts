import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(
  _request: NextRequest,
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

  const { data: assets, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

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
