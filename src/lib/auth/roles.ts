import { SupabaseClient } from "@supabase/supabase-js";

export type TeamRole = "owner" | "admin" | "member" | "viewer";

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<TeamRole | null> {
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", userId)
    .single();

  return (data?.role as TeamRole) ?? null;
}

export function canManageTeam(role: TeamRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canEdit(role: TeamRole | null): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canView(role: TeamRole | null): boolean {
  return role !== null;
}
