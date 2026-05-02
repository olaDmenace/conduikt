import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { requireAdmin } from "@/src/lib/admin/auth";

const VALID_PLANS = ["free", "pro", "growth", "agency"] as const;
type Plan = (typeof VALID_PLANS)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: targetId } = await params;
  const body = await request.json();
  const { action, plan } = body as { action: string; plan?: Plan };

  const service = createServiceClient();

  if (action === "change_plan") {
    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const { error } = await service
      .from("profiles")
      .update({ plan })
      .eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, plan });
  }

  if (action === "reset_count") {
    const { error } = await service
      .from("profiles")
      .update({ generation_count: 0 })
      .eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "disable") {
    const { error } = await service.auth.admin.updateUserById(targetId, {
      ban_duration: "876600h", // ~100 years
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "enable") {
    const { error } = await service.auth.admin.updateUserById(targetId, {
      ban_duration: "none",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
