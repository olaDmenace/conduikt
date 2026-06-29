import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";
import { ensureValidLinkedInToken } from "@/src/lib/integrations/linkedin-token";

/**
 * Scheduled Inngest function that syncs social engagement metrics
 * for all published posts across X and LinkedIn every 6 hours.
 */
export const syncSocialMetrics = inngest.createFunction(
  { id: "sync-social-metrics", retries: 1 },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const supabase = createServiceClient();

    // Step 1: Get all posted scheduled_posts from the last 30 days with
    // external IDs. scheduled_posts has no user_id column, so we resolve it
    // through the project FK (one-account-per-platform-per-user is implicit).
    const posts = await step.run("fetch-published-posts", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from("scheduled_posts")
        .select(
          "id, project_id, channel, external_post_id, projects!inner(user_id)"
        )
        .in("channel", ["x", "linkedin"])
        .eq("status", "posted")
        .not("external_post_id", "is", null)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .limit(200);

      return data ?? [];
    });

    if (posts.length === 0) {
      return { synced: 0, skipped: 0, errors: 0 };
    }

    // Helper: PostgREST returns the nested object as `projects` — typed as
    // either an object or array depending on the relationship. We normalise.
    const getUserId = (p: (typeof posts)[number]): string | undefined => {
      const proj = Array.isArray(p.projects) ? p.projects[0] : p.projects;
      return (proj as { user_id?: string } | null)?.user_id;
    };

    // Step 2: Get unique user IDs and their connected accounts
    const userIds = [
      ...new Set(posts.map((p) => getUserId(p)).filter((u): u is string => Boolean(u))),
    ];

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
      } else if (acc.platform === "linkedin") {
        const freshToken = await ensureValidLinkedInToken(acc);
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
        const userId = getUserId(post);
        const token = userId ? tokenMap.get(`${userId}:${post.channel}`) : undefined;
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
            // LinkedIn engagement reads require Community Management API
            // partner approval (developer.linkedin.com → Marketing Developer
            // Platform). Our standard `w_member_social` consumer scope is
            // write-only — every call here will 403 ACCESS_DENIED until that
            // approval lands. Once it does, the code below already URL-encodes
            // the URN correctly (colons must be %3A in the path).
            //
            // We still attempt the call so that the moment partner access is
            // granted, metrics start flowing — but a 403 is the expected
            // steady state today and is treated as "skip silently", not an
            // error, to keep cron logs clean.
            const res = await fetch(
              `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(post.external_post_id)}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "X-Restli-Protocol-Version": "2.0.0",
                },
              }
            );

            if (res.status === 403) {
              // Expected until partner API approval — silent skip.
              skipped++;
              continue;
            }
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
