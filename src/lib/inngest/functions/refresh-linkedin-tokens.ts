import { inngest } from "../client";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  ensureValidLinkedInToken,
  isLinkedInTokenExpiringSoon,
} from "@/src/lib/integrations/linkedin-token";

/**
 * Proactive refresh — runs every hour and refreshes all LinkedIn tokens
 * that will expire within the next 7 days. LinkedIn access tokens last
 * ~60 days and refresh tokens ~365 days, so this is less urgent than X,
 * but keeps things healthy.
 */
export const refreshLinkedInTokens = inngest.createFunction(
  { id: "refresh-linkedin-tokens", retries: 1 },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();

    const accounts = await step.run("fetch-linkedin-accounts", async () => {
      const { data } = await supabase
        .from("connected_accounts")
        .select("id, user_id, access_token, refresh_token, token_expires_at, platform_username")
        .eq("platform", "linkedin")
        .not("refresh_token", "is", null);

      return data ?? [];
    });

    const result = await step.run("refresh-expiring-tokens", async () => {
      let refreshed = 0;
      let skipped = 0;
      let failed = 0;

      for (const account of accounts) {
        // Refresh tokens expiring within 7 days
        if (!isLinkedInTokenExpiringSoon(account.token_expires_at, 7 * 24 * 60 * 60 * 1000)) {
          skipped++;
          continue;
        }

        const token = await ensureValidLinkedInToken(account, {
          onRefreshFailed: async (acc) => {
            await supabase.from("notifications").insert({
              user_id: acc.user_id,
              type: "integration_expired",
              title: "LinkedIn connection lost",
              body: "Your LinkedIn access has expired and could not be renewed. Reconnect to keep publishing.",
              action_url: "/settings/integrations",
              data: { platform: "linkedin", username: acc.platform_username },
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
      `[refresh-linkedin-tokens] Done: ${result.refreshed} refreshed, ${result.skipped} skipped, ${result.failed} failed out of ${result.total}`
    );

    return result;
  }
);
