import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";

/**
 * Scheduled Inngest function that syncs social engagement metrics
 * for all published posts across X and LinkedIn every 6 hours.
 */
export const syncSocialMetrics = inngest.createFunction(
  { id: "sync-social-metrics", retries: 1 },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const supabase = createServiceClient();

    // Step 1: Get all published posts from the last 30 days with external IDs
    const posts = await step.run("fetch-published-posts", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from("scheduled_posts")
        .select("id, project_id, channel, external_post_id, user_id")
        .in("channel", ["x", "linkedin"])
        .eq("status", "published")
        .not("external_post_id", "is", null)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .limit(200);

      return data ?? [];
    });

    if (posts.length === 0) {
      return { synced: 0, skipped: 0, errors: 0 };
    }

    // Step 2: Get unique user IDs and their connected accounts
    const userIds = [...new Set(posts.map((p) => p.user_id))];

    const accounts = await step.run("fetch-connected-accounts", async () => {
      const { data } = await supabase
        .from("connected_accounts")
        .select("id, user_id, platform, access_token, refresh_token, token_expires_at, platform_username")
        .in("user_id", userIds)
        .in("platform", ["x", "linkedin"]);

      return data ?? [];
    });

    // Refresh X tokens that are expiring and build lookup
    const tokenMap = new Map<string, string>();
    for (const acc of accounts) {
      if (acc.platform === "x") {
        const freshToken = await ensureValidXToken(acc);
        if (freshToken) tokenMap.set(`${acc.user_id}:${acc.platform}`, freshToken);
      } else {
        tokenMap.set(`${acc.user_id}:${acc.platform}`, acc.access_token);
      }
    }

    // Step 3: Sync metrics for each post
    const result = await step.run("sync-all-metrics", async () => {
      let synced = 0;
      let skipped = 0;
      let errors = 0;

      for (const post of posts) {
        const token = tokenMap.get(`${post.user_id}:${post.channel}`);
        if (!token) {
          skipped++;
          continue;
        }

        try {
          if (post.channel === "x") {
            const res = await fetch(
              `https://api.x.com/2/tweets/${post.external_post_id}?tweet.fields=public_metrics`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
              errors++;
              continue;
            }

            const data = await res.json();
            const m = data.data?.public_metrics;
            if (!m) {
              skipped++;
              continue;
            }

            await supabase.from("post_metrics").upsert(
              {
                project_id: post.project_id,
                scheduled_post_id: post.id,
                channel: "x",
                external_post_id: post.external_post_id,
                impressions: m.impression_count ?? 0,
                likes: m.like_count ?? 0,
                shares: m.retweet_count ?? 0,
                comments: m.reply_count ?? 0,
                clicks: m.url_link_clicks ?? 0,
                synced_at: new Date().toISOString(),
              },
              { onConflict: "scheduled_post_id,channel", ignoreDuplicates: false }
            );
            synced++;
          } else if (post.channel === "linkedin") {
            const res = await fetch(
              `https://api.linkedin.com/v2/socialActions/${post.external_post_id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "X-Restli-Protocol-Version": "2.0.0",
                },
              }
            );

            if (!res.ok) {
              errors++;
              continue;
            }

            const data = await res.json();

            await supabase.from("post_metrics").upsert(
              {
                project_id: post.project_id,
                scheduled_post_id: post.id,
                channel: "linkedin",
                external_post_id: post.external_post_id,
                impressions: 0,
                likes: data.likesSummary?.totalLikes ?? 0,
                shares: data.sharesSummary?.totalShares ?? 0,
                comments:
                  data.commentsSummary?.totalFirstLevelComments ?? 0,
                clicks: 0,
                synced_at: new Date().toISOString(),
              },
              { onConflict: "scheduled_post_id,channel", ignoreDuplicates: false }
            );
            synced++;
          }
        } catch {
          errors++;
          // Continue — don't let one failure stop the sync
        }
      }

      return { synced, skipped, errors };
    });

    console.log(
      `[sync-social-metrics] Done: synced=${result.synced}, skipped=${result.skipped}, errors=${result.errors}`
    );

    return result;
  }
);
