import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  ensureValidXToken,
  isTokenExpiringSoon,
} from "@/src/lib/integrations/x-token";

/**
 * Proactive refresh — runs every 90 minutes and refreshes all X tokens
 * that will expire within the next 30 minutes. This keeps background
 * jobs (cron publisher, metrics sync) working even when the user isn't
 * actively publishing.
 */
export const refreshXTokens = inngest.createFunction(
  { id: "refresh-x-tokens", retries: 1 },
  { cron: "*/90 * * * *" },
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

      for (const account of accounts) {
        // Refresh tokens expiring within 30 minutes
        if (!isTokenExpiringSoon(account.token_expires_at, 30 * 60 * 1000)) {
          skipped++;
          continue;
        }

        const token = await ensureValidXToken(account, {
          onRefreshFailed: async (acc) => {
            // Insert notification for the user
            await supabase.from("notifications").insert({
              user_id: acc.user_id,
              type: "integration_expired",
              title: "X connection lost",
              body: "Your X (Twitter) access has expired and could not be renewed. Reconnect to keep publishing.",
              action_url: "/settings/integrations",
              data: { platform: "x", username: acc.platform_username },
            });
          },
        });

        if (token) {
          refreshed++;
        } else {
          failed++;
        }
      }

      return { total: accounts.length, refreshed, skipped, failed };
    });

    console.log(
      `[refresh-x-tokens] Done: ${result.refreshed} refreshed, ${result.skipped} skipped, ${result.failed} failed out of ${result.total}`
    );

    return result;
  }
);
