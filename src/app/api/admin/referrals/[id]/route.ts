import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin/auth";
import { createServiceClient } from "@/src/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.partner_name !== undefined) updates.partner_name = body.partner_name;
  if (body.partner_email !== undefined) updates.partner_email = body.partner_email;
  if (body.active !== undefined) updates.active = !!body.active;
  if (body.commission_type !== undefined) updates.commission_type = body.commission_type;
  if (body.commission_rate !== undefined) updates.commission_rate = body.commission_rate;
  if (body.flat_amount_usd !== undefined) updates.flat_amount_usd = body.flat_amount_usd;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("referral_links")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const svc = createServiceClient();
  const { error } = await svc.from("referral_links").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
