import { SupabaseClient } from "@supabase/supabase-js";

export async function buildPerformanceContext(
  projectId: string,
  supabase: SupabaseClient
): Promise<string> {
  const sections: string[] = [];

  // 1. Published asset performance
  const { data: assets } = await supabase
    .from("assets")
    .select("title, type, status, performance, created_at")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  if (assets && assets.length > 0) {
    const withPerf = assets.filter(
      (a) => a.performance && Object.keys(a.performance).length > 0
    );
    if (withPerf.length > 0) {
      sections.push("### Published Content Performance");
      for (const a of withPerf.slice(0, 10)) {
        const perf = a.performance as Record<string, unknown>;
        sections.push(
          `- **${a.title}** (${a.type}): ${Object.entries(perf)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")}`
        );
      }
    }
  }

  // 2. Scheduled posts success/fail rates
  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("channel, status")
    .eq("project_id", projectId);

  if (posts && posts.length > 0) {
    const byChannel: Record<string, { total: number; published: number; failed: number }> = {};
    for (const p of posts) {
      if (!byChannel[p.channel]) {
        byChannel[p.channel] = { total: 0, published: 0, failed: 0 };
      }
      byChannel[p.channel].total++;
      if (p.status === "published") byChannel[p.channel].published++;
      if (p.status === "failed") byChannel[p.channel].failed++;
    }
    sections.push("### Publishing Success Rates");
    for (const [channel, stats] of Object.entries(byChannel)) {
      const rate =
        stats.total > 0
          ? Math.round((stats.published / stats.total) * 100)
          : 0;
      sections.push(
        `- **${channel}**: ${rate}% success (${stats.published}/${stats.total} published, ${stats.failed} failed)`
      );
    }
  }

  // 3. Latest audit score + trend
  const { data: audits } = await supabase
    .from("audits")
    .select("score, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (audits && audits.length > 0) {
    const latest = audits[0].score;
    const trend =
      audits.length > 1
        ? latest !== null && audits[1].score !== null
          ? latest > audits[1].score
            ? "improving"
            : latest < audits[1].score
            ? "declining"
            : "stable"
          : "unknown"
        : "first audit";
    sections.push("### SEO Audit Status");
    sections.push(
      `- Latest score: **${latest}/100** (trend: ${trend})`
    );
  }

  // 4. Top GSC keywords
  const { data: keywords } = await supabase
    .from("keyword_data")
    .select("keyword, clicks, impressions, position")
    .eq("project_id", projectId)
    .order("clicks", { ascending: false })
    .limit(10);

  if (keywords && keywords.length > 0) {
    sections.push("### Top Search Keywords (Google Search Console)");
    for (const kw of keywords) {
      sections.push(
        `- "${kw.keyword}" — ${kw.clicks} clicks, ${kw.impressions} impressions, avg pos ${Math.round(kw.position)}`
      );
    }
  }

  if (sections.length === 0) return "";

  return (
    "\n\n## Past Performance Data\nUse this data to inform your content decisions. Lean into what's working and improve what isn't.\n\n" +
    sections.join("\n")
  );
}
