import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { setUserRole, findUserByEmail } from "@/src/lib/admin/queries";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, action } = body as { email: string; action: "promote" | "demote" };

  if (!email || !action) {
    return NextResponse.json({ error: "Missing email or action" }, { status: 400 });
  }

  // Find the target user
  const target = await findUserByEmail(email);
  if (!target) {
    return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
  }

  // Prevent self-demotion
  if (action === "demote" && target.id === user.id) {
    return NextResponse.json(
      { error: "You cannot demote yourself" },
      { status: 400 }
    );
  }

  const newRole = action === "promote" ? "admin" : "user";
  const { error } = await setUserRole(target.id, newRole);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: { id: target.id, name: target.full_name, role: newRole },
  });
}
