import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { requireAdmin } from "@/src/lib/admin/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "admin_emails")
    .single();

  return NextResponse.json({ emails: data?.value ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { emails } = (await request.json()) as { emails: string[] };

  if (!Array.isArray(emails)) {
    return NextResponse.json({ error: "emails must be an array" }, { status: 400 });
  }

  // Normalize emails
  const cleaned = emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "admin_emails", value: cleaned, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, emails: cleaned });
}
