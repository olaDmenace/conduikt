import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile, projects (with assets), and latest audit in parallel
  const [profileRes, projectsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, generation_count")
      .eq("id", user.id)
      .single(),
    supabase
      .from("projects")
      .select(
        `
        id,
        assets(id, status),
        audits(score, created_at)
      `
      )
      .eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const projects = projectsRes.data ?? [];
  const projectCount = projects.length;

  // Aggregate assets and audit scores across all user projects
  let assetCount = 0;
  let publishedCount = 0;
  let latestAuditScore: number | null = null;
  let latestAuditDate = "";

  for (const p of projects) {
    const assets = (p as { assets?: Array<{ id: string; status: string }> }).assets ?? [];
    assetCount += assets.length;
    publishedCount += assets.filter((a) => a.status === "published").length;

    const audits = (p as { audits?: Array<{ score: number | null; created_at: string }> }).audits ?? [];
    for (const a of audits) {
      if (a.created_at > latestAuditDate) {
        latestAuditDate = a.created_at;
        latestAuditScore = a.score;
      }
    }
  }

  const limits: Record<string, number> = {
    free: 5,
    pro: 100,
    growth: 999999,
    agency: 999999,
  };
  const plan = profile?.plan ?? "free";
  const generationCount = profile?.generation_count ?? 0;
  const generationLimit = limits[plan] ?? 5;
  const generationsLeft = Math.max(0, generationLimit - generationCount);

  // Most recently created project id (for dashboard action links)
  const latestProjectId = projects[projects.length - 1]?.id ?? null;

  return NextResponse.json({
    projectCount,
    assetCount,
    publishedCount,
    generationsLeft,
    generationCount,
    generationLimit,
    latestAuditScore,
    plan,
    latestProjectId,
  });
}
