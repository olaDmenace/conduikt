import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerMembership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (!callerMembership) {
    return NextResponse.json([]);
  }

  const { data: members } = await supabase
    .from("team_members")
    .select(
      "id, user_id, role, status, invite_email, created_at, profiles(full_name, avatar_url)"
    )
    .eq("team_id", callerMembership.team_id)
    .order("created_at", { ascending: true });

  return NextResponse.json(members ?? []);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await request.json();
  if (!memberId) {
    return NextResponse.json({ error: "Member ID required" }, { status: 400 });
  }

  const { data: callerMembership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (!callerMembership) {
    return NextResponse.json({ error: "Not authorized to manage team" }, { status: 403 });
  }

  const { data: target } = await supabase
    .from("team_members")
    .select("user_id, role, team_id")
    .eq("id", memberId)
    .single();

  if (!target || target.team_id !== callerMembership.team_id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.user_id === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", callerMembership.team_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
