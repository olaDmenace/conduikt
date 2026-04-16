import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

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

  const ownedProject = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*, campaign_steps(id, step_order, agent_id, status)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(campaigns ?? []);
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

  const { name, steps, type: explicitType } = await request.json();

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json(
      { error: "Name and at least one step are required" },
      { status: 400 }
    );
  }

  // Infer campaign type from first agent if not explicitly provided
  const agentToType: Record<string, string> = {
    "seo-audit": "seo_audit",
    "cro-analysis": "page_cro",
    "email-sequence": "email_sequence",
    "social-content": "social_content",
    "programmatic-seo": "programmatic_seo",
    "ab-test": "ab_test",
    "blog-post": "full_funnel",
    "keyword-research": "seo_audit",
    "copywriting": "social_content",
    "growth-playbook": "full_funnel",
    "content-strategy": "full_funnel",
    "competitor-intel": "full_funnel",
  };

  const validTypes = [
    "seo_audit",
    "page_cro",
    "email_sequence",
    "social_content",
    "programmatic_seo",
    "launch",
    "ab_test",
    "full_funnel",
  ];

  const firstAgentId = steps[0]?.agent_id as string | undefined;
  const inferredType = firstAgentId ? agentToType[firstAgentId] : undefined;
  const campaignType = validTypes.includes(explicitType)
    ? explicitType
    : inferredType ?? "full_funnel";

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: id,
      name,
      type: campaignType,
      status: "draft",
    })
    .select()
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: campaignError?.message || "Failed to create campaign" },
      { status: 500 }
    );
  }

  // Create steps
  const stepRows = steps.map(
    (step: { agent_id: string; config?: Record<string, unknown> }, i: number) => ({
      campaign_id: campaign.id,
      step_order: i + 1,
      agent_id: step.agent_id,
      config: step.config || {},
      status: "pending",
    })
  );

  const { error: stepsError } = await supabase
    .from("campaign_steps")
    .insert(stepRows);

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  // Re-fetch with steps
  const { data: full } = await supabase
    .from("campaigns")
    .select("*, campaign_steps(id, step_order, agent_id, status, config)")
    .eq("id", campaign.id)
    .single();

  return NextResponse.json(full);
}
