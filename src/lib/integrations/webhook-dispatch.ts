import { createServiceClient } from "@/src/lib/supabase/service";

export type WebhookEvent =
  | "post.published"
  | "audit.completed"
  | "content.generated"
  | "content.saved";

interface WebhookConfig {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  type: "wordpress" | "webflow" | "buffer" | "generic";
  endpoint_url: string;
  auth_token: string | null;
  config: Record<string, unknown>;
}

interface DispatchPayload {
  event: WebhookEvent;
  title: string;
  content: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
}

function buildHeaders(webhook: WebhookConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (webhook.type === "wordpress" && webhook.auth_token) {
    headers["Authorization"] = `Basic ${Buffer.from(webhook.auth_token).toString("base64")}`;
  } else if (webhook.auth_token) {
    headers["Authorization"] = `Bearer ${webhook.auth_token}`;
  }

  return headers;
}

function buildBody(webhook: WebhookConfig, payload: DispatchPayload): unknown {
  switch (webhook.type) {
    case "wordpress":
      return {
        title: payload.title,
        content: payload.content,
        status: "draft",
      };

    case "webflow": {
      const collectionId = (webhook.config as Record<string, string>)?.collection_id;
      return {
        fields: {
          name: payload.title,
          "post-body": payload.content,
          slug: payload.title?.toLowerCase().replace(/\s+/g, "-"),
        },
        ...(collectionId ? { collectionId } : {}),
      };
    }

    case "buffer":
      return {
        text: payload.content,
        profile_ids: (webhook.config as Record<string, string[]>)?.profile_ids ?? [],
      };

    case "generic":
    default:
      return {
        event: payload.event,
        title: payload.title,
        content: payload.content,
        type: payload.contentType,
        timestamp: new Date().toISOString(),
        source: "conduikt",
        ...payload.metadata,
      };
  }
}

/**
 * Fire all active webhooks for a user (optionally scoped to a project).
 * Runs fire-and-forget — failures are logged but don't block the caller.
 */
export async function dispatchWebhooks(
  userId: string,
  projectId: string | null,
  payload: DispatchPayload
): Promise<{ sent: number; failed: number }> {
  const db = createServiceClient();

  let query = db
    .from("webhook_configs")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);

  if (projectId) {
    // Match webhooks scoped to this project OR global (null project_id)
    query = query.or(`project_id.eq.${projectId},project_id.is.null`);
  }

  const { data: webhooks } = await query;

  if (!webhooks?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    webhooks.map(async (webhook) => {
      try {
        const res = await fetch(webhook.endpoint_url, {
          method: "POST",
          headers: buildHeaders(webhook),
          body: JSON.stringify(buildBody(webhook, payload)),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          console.warn(
            `[webhook-dispatch] ${webhook.name} returned ${res.status} for ${payload.event}`
          );
        }
      } catch (err) {
        failed++;
        console.warn(
          `[webhook-dispatch] ${webhook.name} failed for ${payload.event}:`,
          err
        );
      }
    })
  );

  return { sent, failed };
}
