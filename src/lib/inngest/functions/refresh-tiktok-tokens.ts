import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  ensureValidTikTokToken,
  isTikTokTokenExpiringSoon,
} from "@/src/lib/integrations/tiktok-token";
import {
  sendRefreshRunAdminAlert,
  type RefreshFailureRecord,
} from "@/src/lib/integrations/reconnect-helpers";

/**
 * Proactive refresh — runs every hour and refreshes all TikTok tokens
 * that will expire within the next 2 hours. TikTok access tokens last
 * 24 hours by default and refresh tokens ~1 year, so anyone who doesn't
 * publish daily needs this cron running to stay connected.
 *
 * Per-user notification and email happen inside ensureValidTikTokToken
 * -> notifyTokenDeath. This cron additionally sends ONE admin summary
 * email (via sendRefreshRunAdminAlert) if any accounts failed in the
 * run — that's the aggregate visibility layer.
 */
export const refreshTiktokTokens = inngest.createFunction(
  { id: "refresh-tiktok-tokens", retries: 1 },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();

    const accounts = await step.run("fetch-tiktok-accounts", async () => {
      const { data } = await supabase
        .from("connected_accounts")
        .select(
          "id, user_id, access_token, refresh_token, token_expires_at, platform_username",
        )
        .eq("platform", "tiktok")
        .not("refresh_token", "is", null);

      return data ?? [];
    });

    const result = await step.run("refresh-expiring-tokens", async () => {
      let refreshed = 0;
      let skipped = 0;
      let failed = 0;
      const failures: RefreshFailureRecord[] = [];

      for (const account of accounts) {
        // Refresh tokens expiring within the next 2 hours. TikTok access
        // tokens are 24h — a 2h buffer means each account gets ~12 chances
        // to refresh cleanly per day, well before publishers hit expiry.
        if (
          !isTikTokTokenExpiringSoon(
            account.token_expires_at,
            2 * 60 * 60 * 1000,
          )
        ) {
          skipped++;
          continue;
        }

        // Per-user notification + email fire from inside the helper via
        // notifyTokenDeath — don't pass onRefreshFailed here or the user
        // gets duplicated notifications.
        const token = await ensureValidTikTokToken(account);

        if (token) {
          refreshed++;
        } else {
          failed++;
          failures.push({
            accountId: account.id,
            userId: account.user_id,
            platformUsername: account.platform_username,
          });
        }
      }

      return {
        total: accounts.length,
        refreshed,
        skipped,
        failed,
        failures,
      };
    });

    console.log(
      `[refresh-tiktok-tokens] Done: ${result.refreshed} refreshed, ${result.skipped} skipped, ${result.failed} failed out of ${result.total}`,
    );

    // Admin visibility — one email per run, only when failures happened.
    // No-op if ADMIN_ALERT_EMAIL / RESEND_API_KEY aren't set.
    await sendRefreshRunAdminAlert(
      "tiktok",
      {
        total: result.total,
        refreshed: result.refreshed,
        skipped: result.skipped,
        failed: result.failed,
      },
      result.failures,
    ).catch((err) =>
      console.error(
        "[refresh-tiktok-tokens] Admin alert send failed:",
        err,
      ),
    );

    return {
      total: result.total,
      refreshed: result.refreshed,
      skipped: result.skipped,
      failed: result.failed,
    };
  },
);
