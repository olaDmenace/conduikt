import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A list read, not a model call: generous, but the full audit history
  // is a wide row set, so it is not free either.
  const rl = await rateLimit(`audits-list:${user.id}`, { limit: 60, windowSeconds: 600 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const project = await verifyProjectOwnership(supabase, id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: audits, error } = await supabase
    .from("audits")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(audits ?? []);
}
