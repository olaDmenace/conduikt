import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin/auth";
import { createServiceClient } from "@/src/lib/supabase/service";

// POST — create a new referral link
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    code,
    label,
    partner_name,
    partner_email,
    commission_type,
    commission_rate,
    flat_amount_usd,
    notes,
  } = body ?? {};

  if (!code || !label || !partner_name || !partner_email) {
    return NextResponse.json(
      { error: "code, label, partner_name, and partner_email are required" },
      { status: 400 }
    );
  }

  const slug = String(code)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("referral_links")
    .insert({
      code: slug,
      label,
      partner_name,
      partner_email,
      commission_type: commission_type === "flat" ? "flat" : "percentage",
      commission_rate:
        commission_type === "flat" ? null : Number(commission_rate ?? 0.2),
      flat_amount_usd:
        commission_type === "flat" ? Number(flat_amount_usd ?? 0) : null,
      notes: notes ?? null,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A referral link with that code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
