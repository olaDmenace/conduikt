import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify the authenticated user owns the given project.
 * Returns the project row if owned, null otherwise.
 */
export async function verifyProjectOwnership(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
) {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  return data;
}
