import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { availableEngines, getVisibilitySummary } from "@/src/lib/integrations/ai-visibility";

// GET /api/projects/{id}/visibility?days=14
// What the answer engines said about this project. Reads the stored
// checks only; the nightly job fills them. Without an engine key the
// response says so in plain words with status 200.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const daysRaw = Number(new URL(request.url).searchParams.get("days") ?? "14");
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 14;

  try {
    const summary = await getVisibilitySummary(createServiceClient(), id, days);
    const configured = availableEngines().length > 0;
    return NextResponse.json({
      ...summary,
      configured,
      days,
      reason: configured
        ? summary.checkedQuestions === 0
          ? "No checks yet. The first run happens overnight."
          : null
        : "No answer engine is set up yet. Add a Perplexity key to start checking.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read visibility checks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
