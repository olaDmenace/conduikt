import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  ensureValidXToken,
  isTokenExpiringSoon,
} from "@/src/lib/integrations/x-token";
import {
  sendRefreshRunAdminAlert,
  type RefreshFailureRecord,
} from "@/src/lib/integrations/reconnect-helpers";

/**
 * Proactive refresh — runs every hour and refreshes all X tokens that
 * will expire within the next 30 minutes. This keeps background jobs
 * (cron publisher, metrics sync) working even when the user isn't
 * actively publishing.
 *
 * Per-user notification and email happen inside ensureValidXToken via
 * notifyTokenDeath. This cron additionally sends ONE admin summary
 * email (via sendRefreshRunAdminAlert) if any accounts failed in the
 * run — that's the aggregate visibility layer.
 */
export const refreshXTokens = inngest.createFunction(
  { id: "refresh-x-tokens", retries: 1 },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();

    const accounts = await step.run("fetch-x-accounts", async () => {
      const { data } = await supabase
        .from("connected_accounts")
        .select("id, user_id, access_token, refresh_token, token_expires_at, platform_username")
        .eq("platform", "x")
        .not("refresh_token", "is", null);

      return data ?? [];
    });

    const result = await step.run("refresh-expiring-tokens", async () => {
      let refreshed = 0;
      let skipped = 0;
      let failed = 0;
      const failures: RefreshFailureRecord[] = [];

      for (const account of accounts) {
        // Refresh tokens expiring within 30 minutes
        if (!isTokenExpiringSoon(account.token_expires_at, 30 * 60 * 1000)) {
          skipped++;
          continue;
        }

        // Per-user notification + email fire from inside the helper via
        // notifyTokenDeath — don't pass onRefreshFailed here or the user
        // gets duplicated notifications.
        const token = await ensureValidXToken(account);

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
      `[refresh-x-tokens] Done: ${result.refreshed} refreshed, ${result.skipped} skipped, ${result.failed} failed out of ${result.total}`
    );

    // Admin visibility — one email per run, only when failures happened.
    // No-op if ADMIN_ALERT_EMAIL / RESEND_API_KEY aren't set.
    await sendRefreshRunAdminAlert(
      "x",
      {
        total: result.total,
        refreshed: result.refreshed,
        skipped: result.skipped,
        failed: result.failed,
      },
      result.failures,
    ).catch((err) =>
      console.error("[refresh-x-tokens] Admin alert send failed:", err),
    );

    return {
      total: result.total,
      refreshed: result.refreshed,
      skipped: result.skipped,
      failed: result.failed,
    };
  }
);
