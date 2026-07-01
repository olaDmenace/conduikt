// Fetches @olaDmenace's public X metrics for the playbook's recap brackets
// (Day 7 weekly recap, Day 14 final recap). Uses the existing connected_accounts
// row for user A — same token + refresh path the publish cron uses.

import { createServiceClient } from "@/src/lib/supabase/service";
import { ensureValidXToken } from "@/src/lib/integrations/x-token";

const PLAYBOOK_USER_ID = "e2bb2edd-6d6c-4288-a386-145151c264ba";

export interface XPublicMetrics {
  platformUserId: string;
  username: string | null;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount: number;
}

/**
 * Fetch live public_metrics from the X API for the playbook owner's account.
 * Returns null if no X account is connected or token refresh fails.
 */
export async function fetchPlaybookXMetrics(): Promise<XPublicMetrics | null> {
  const db = createServiceClient();
  const { data: account } = await db
    .from("connected_accounts")
    .select(
      "id, user_id, access_token, refresh_token, token_expires_at, platform_username, platform_user_id"
    )
    .eq("user_id", PLAYBOOK_USER_ID)
    .eq("platform", "x")
    .maybeSingle();

  if (!account?.access_token) return null;

  const token = await ensureValidXToken(account);
  if (!token) return null;

  const res = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=public_metrics,username",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    console.error("[x-metrics] /users/me failed:", res.status);
    return null;
  }

  const json = (await res.json()) as {
    data?: {
      id?: string;
      username?: string;
      public_metrics?: {
        followers_count?: number;
        following_count?: number;
        tweet_count?: number;
        listed_count?: number;
      };
    };
  };

  const m = json.data?.public_metrics;
  if (!json.data?.id || !m) return null;

  return {
    platformUserId: json.data.id,
    username: json.data.username ?? account.platform_username ?? null,
    followersCount: m.followers_count ?? 0,
    followingCount: m.following_count ?? 0,
    tweetCount: m.tweet_count ?? 0,
    listedCount: m.listed_count ?? 0,
  };
}

/**
 * Persist today's metrics to x_account_metrics_snapshots so Day 7 and Day 14
 * recap posts can reference Day 1's baseline. Upserts on (snapshot_date, user).
 */
export async function snapshotXMetrics(
  metrics: XPublicMetrics,
  forDate: string // YYYY-MM-DD
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("x_account_metrics_snapshots").upsert(
    {
      snapshot_date: forDate,
      platform_user_id: metrics.platformUserId,
      followers_count: metrics.followersCount,
      following_count: metrics.followingCount,
      tweet_count: metrics.tweetCount,
      listed_count: metrics.listedCount,
    },
    { onConflict: "snapshot_date,platform_user_id" }
  );
  if (error) {
    console.error("[x-metrics] snapshot upsert failed:", error.message);
  }
}

/**
 * Look up the followers_count from a specific snapshot date.
 * Used by Day 7/14 recap to fill {FOLLOWERS_START}.
 */
export async function lookupFollowersAt(
  date: string, // YYYY-MM-DD
  platformUserId: string
): Promise<number | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("x_account_metrics_snapshots")
    .select("followers_count")
    .eq("snapshot_date", date)
    .eq("platform_user_id", platformUserId)
    .maybeSingle();
  return data?.followers_count ?? null;
}
