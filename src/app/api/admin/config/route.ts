import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "admin_emails")
    .single();

  return NextResponse.json({ emails: data?.value ?? [] });
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
