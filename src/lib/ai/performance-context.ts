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
    // scheduled_posts.status values: "pending" | "posted" | "failed" | "cancelled"
    const byChannel: Record<string, { total: number; posted: number; failed: number }> = {};
    for (const p of posts) {
      if (!byChannel[p.channel]) {
        byChannel[p.channel] = { total: 0, posted: 0, failed: 0 };
      }
      byChannel[p.channel].total++;
      if (p.status === "posted") byChannel[p.channel].posted++;
      if (p.status === "failed") byChannel[p.channel].failed++;
    }
    sections.push("### Publishing Success Rates");
    for (const [channel, stats] of Object.entries(byChannel)) {
      const rate =
        stats.total > 0
          ? Math.round((stats.posted / stats.total) * 100)
          : 0;
      sections.push(
        `- **${channel}**: ${rate}% success (${stats.posted}/${stats.total} posted, ${stats.failed} failed)`
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

  // 4. Top GSC keywords (column is `term`, not `keyword`)
  const { data: keywords } = await supabase
    .from("keyword_data")
    .select("term, clicks, impressions, position")
    .eq("project_id", projectId)
    .order("clicks", { ascending: false })
    .limit(10);

  if (keywords && keywords.length > 0) {
    sections.push("### Top Search Keywords (Google Search Console)");
    for (const kw of keywords) {
      sections.push(
        `- "${kw.term}" — ${kw.clicks} clicks, ${kw.impressions} impressions, avg pos ${Math.round(kw.position)}`
      );
    }
  }

  // 5. Top performing social posts (from post_metrics)
  const { data: topPosts } = await supabase
    .from("post_metrics")
    .select(
      "impressions, likes, shares, comments, channel, scheduled_post_id"
    )
    .eq("project_id", projectId)
    .order("impressions", { ascending: false })
    .limit(3);

  if (topPosts && topPosts.length > 0) {
    // scheduled_posts has no `content` column — the post text lives on the
    // linked asset (`assets.content.scheduled_text` or `.raw`). Join through.
    const postIds = topPosts.map((p) => p.scheduled_post_id).filter(Boolean);
    const { data: scheduledPosts } = await supabase
      .from("scheduled_posts")
      .select("id, assets(content)")
      .in("id", postIds);

    const postMap = new Map<string, string>();
    for (const sp of scheduledPosts ?? []) {
      const asset = Array.isArray(sp.assets) ? sp.assets[0] : sp.assets;
      const content = (asset as { content?: Record<string, unknown> } | null)?.content;
      const text =
        (content?.scheduled_text as string | undefined) ??
        (content?.raw as string | undefined) ??
        "";
      if (sp.id) postMap.set(sp.id as string, text);
    }

    sections.push("### Top Performing Social Posts");
    sections.push(
      "Use these as examples of what resonates with the audience:"
    );
    for (const p of topPosts) {
      const text = (postMap.get(p.scheduled_post_id) ?? "").slice(0, 200) || "N/A";
      sections.push(
        `- **${p.channel}** (${p.impressions} impressions, ${p.likes} likes): "${text}"`
      );
    }
  }

  if (sections.length === 0) return "";

  return (
    "\n\n## Past Performance Data\nUse this data to inform your content decisions. Lean into what's working and improve what isn't.\n\n" +
    sections.join("\n")
  );
}
