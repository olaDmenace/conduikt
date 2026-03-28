import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agent_id, prompt, result, usage } = await request.json();

  if (!agent_id || !result) {
    return NextResponse.json(
      { error: "agent_id and result are required" },
      { status: 400 }
    );
  }

  // Save as a playground generation in ai_generations (user-scoped, no project)
  // Also try to find user's first project to save as an asset
  const { data: firstProject } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!firstProject) {
    return NextResponse.json(
      { error: "Create a project first to save playground outputs" },
      { status: 400 }
    );
  }

  // Map agent to asset type
  const agentToAssetType: Record<string, string> = {
    "seo-audit": "audit_report",
    "page-cro": "audit_report",
    "copywriting": "copy_block",
    "social-content": "social_post",
    "email-sequence": "email",
    "content-strategy": "copy_block",
    "competitor-analysis": "audit_report",
    "blog-post": "copy_block",
    "keyword-research": "audit_report",
    "growth-playbook": "copy_block",
  };

  const assetType = agentToAssetType[agent_id] ?? "copy_block";

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      project_id: firstProject.id,
      type: assetType,
      title: `Playground: ${agent_id}`,
      content: { raw: result, prompt, agent_id, usage },
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(asset, { status: 201 });
}
