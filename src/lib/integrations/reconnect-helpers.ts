// Shared helpers for the OAuth callback flow.
// - retryFailedPostsAfterReconnect: after a successful reconnect, flip any
//   scheduled_posts that failed with a "no connected account" error back to
//   pending so the publish cron picks them up on its next tick.
// - notifyTokenDeath: called from the token-refresh helpers when a token
//   goes permanently dead. Creates a dashboard notification + sends a
//   transactional email so the user actually finds out.
//
// Both wrap in try/catch when called from OAuth flows / cron paths so a
// failure here NEVER breaks the primary path.

import { Resend } from "resend";
import { createServiceClient } from "@/src/lib/supabase/service";
import { createNotification } from "@/src/lib/notifications";

const CHANNEL_LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  facebook: "Facebook",
};

/**
 * After a successful OAuth reconnect, flip token-related failed posts back
 * to `pending` so the publish cron picks them up on its next tick.
 *
 * Scope guardrails:
 *   - Only posts for projects owned by this user
 *   - Only the reconnected channel
 *   - Only rows where error_message signals a token/connection issue
 *   - Only rows updated in the last 14 days — avoid resurrecting ancient
 *     failures the user has moved on from
 *
 * Returns the number of posts flipped, mostly for logging.
 */
export async function retryFailedPostsAfterReconnect(
  userId: string,
  channel: string,
): Promise<number> {
  const db = createServiceClient();

  const { data: projects } = await db
    .from("projects")
    .select("id")
    .eq("user_id", userId);

  const projectIds = (projects ?? []).map((p) => p.id as string);
  if (projectIds.length === 0) return 0;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: updated, error } = await db
    .from("scheduled_posts")
    .update({ status: "pending", error_message: null })
    .in("project_id", projectIds)
    .eq("channel", channel)
    .eq("status", "failed")
    .or(
      "error_message.ilike.%no connected%," +
        "error_message.ilike.%token expired%," +
        "error_message.ilike.%reconnect%",
    )
    .gte("updated_at", fourteenDaysAgo.toISOString())
    .select("id");

  if (error) {
    console.error(
      `[reconnect-helpers] Failed to retry posts for ${userId}/${channel}: ${error.message}`,
    );
    return 0;
  }

  return updated?.length ?? 0;
}

/**
 * Called from the token-refresh helpers when a token goes permanently
 * dead (refresh failed after retries, or the platform revoked it).
 * Creates a dashboard notification AND sends a transactional email.
 *
 * Never throws — a failed notification must not block the token helper.
 */
export async function notifyTokenDeath(
  userId: string,
  channel: string,
  platformUsername: string | null,
): Promise<void> {
  const channelLabel = CHANNEL_LABELS[channel] ?? channel;
  const handle = platformUsername ? `@${platformUsername}` : "your account";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://conduikt.com";

  // 1. Dashboard notification — user sees a red dot next time they log in.
  try {
    await createNotification(userId, {
      type: "integration_expired",
      title: `${channelLabel} needs reconnection`,
      body: `${channelLabel} (${handle}) token has expired and could not be auto-refreshed. Scheduled posts for this channel are on hold until you reconnect.`,
      actionUrl: "/settings/integrations",
    });
  } catch (err) {
    console.error(
      `[notify-token-death] Notification insert failed for ${userId}/${channel}:`,
      err,
    );
  }

  // 2. Transactional email — user sees this even if they don't log in soon.
  //    Best-effort: skip cleanly if RESEND_API_KEY is missing.
  if (!process.env.RESEND_API_KEY) return;

  try {
    const db = createServiceClient();
    const { data: authRow } = await db.auth.admin.getUserById(userId);
    const email = authRow?.user?.email;
    if (!email) return;

    const displayName =
      (authRow.user?.user_metadata?.full_name as string | undefined) ??
      email.split("@")[0];
    const settingsUrl = `${appUrl}/settings/integrations`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Conduikt <hello@contacts.conduikt.com>",
      to: email,
      subject: `Reconnect ${channelLabel} to resume scheduled posts`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e0db;">
        <tr><td style="background:#1a1714;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#1F6B66;letter-spacing:-0.5px;">Conduikt</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#1a1714;">Hi ${displayName},</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a342e;">
            Your <strong>${channelLabel}</strong> connection (${handle}) expired and Conduikt could not refresh it automatically. This can happen if you changed your password, revoked access, or updated your handle on ${channelLabel}.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a342e;">
            <strong>Scheduled posts for this channel are on hold</strong> until you reconnect. Once you reconnect, any recently-failed posts will automatically re-queue.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${settingsUrl}" style="display:inline-block;background:#1F6B66;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Reconnect ${channelLabel}</a>
          </p>
          <p style="margin:0;font-size:13px;color:#8a8176;">
            If this looks unexpected, ignore this email — no action needed.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });
  } catch (err) {
    console.error(
      `[notify-token-death] Email send failed for ${userId}/${channel}:`,
      err,
    );
  }
}
