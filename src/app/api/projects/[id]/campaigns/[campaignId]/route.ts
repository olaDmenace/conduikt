import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id, campaignId } = await params;
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

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*, campaign_steps(id, step_order, agent_id, status, config, result, started_at, completed_at)")
    .eq("id", campaignId)
    .eq("project_id", id)
    .order("step_order", { referencedTable: "campaign_steps", ascending: true })
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}
