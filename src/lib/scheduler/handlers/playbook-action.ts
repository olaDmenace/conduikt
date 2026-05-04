import { registerHandler } from "../registry";
import type { ExecutionHandler } from "../types";

// Handler for execution_type='playbook_action'.
//
// Fired when a queued Growth Playbook action's hold window expires (or
// immediately, for 'auto' mode). Inserts the asset into scheduled_posts
// so the existing publish cron picks it up — we don't reach out to the
// platform APIs here.
//
// Payload shape:
//   { assetId, projectId, channel: 'x' | 'linkedin', actionId, mode }
//
// Pre-publish gates:
//   1. Asset still exists and isn't already published (user may have
//      manually published from the editor between queue and tick).
//   2. The user still has a connected_account for that channel — if
//      they disconnected it, the cron would just fail; we surface a
//      clearer error here and skip.

interface Payload {
  assetId: string;
  projectId: string;
  channel: "x" | "linkedin";
  actionId?: string;
  mode?: string;
}

function isPayload(p: unknown): p is Payload {
  if (!p || typeof p !== "object") return false;
  const x = p as Payload;
  return (
    typeof x.assetId === "string" &&
    typeof x.projectId === "string" &&
    (x.channel === "x" || x.channel === "linkedin")
  );
}

const handler: ExecutionHandler = async (rawPayload, { execution, supabase }) => {
  void execution;
  if (!isPayload(rawPayload)) {
    return { ok: false, error: "Invalid payload shape", retryable: false };
  }
  const { assetId, projectId, channel } = rawPayload;

  // Asset still around + not already published.
  const { data: asset } = await supabase
    .from("assets")
    .select("id, project_id, status, content")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return {
      ok: false,
      error: "Asset was deleted before the queued action could run",
      retryable: false,
    };
  }
  if (asset.project_id !== projectId) {
    return {
      ok: false,
      error: "Asset/project mismatch — payload tampering or stale execution",
      retryable: false,
    };
  }
  if (asset.status === "published") {
    // User manually published from the editor — treat as success and
    // skip the publish step.
    return { ok: true, result: { skipped: true, reason: "already_published" } };
  }

  const content = (asset.content ?? {}) as Record<string, unknown>;
  const scheduledText =
    typeof content.scheduled_text === "string" && content.scheduled_text
      ? content.scheduled_text
      : typeof content.raw === "string"
        ? content.raw
        : null;
  if (!scheduledText) {
    return {
      ok: false,
      error: "Asset has no scheduled_text/raw content to publish",
      retryable: false,
    };
  }

  // Verify the user still has a connected account for this channel.
  // Without one, the publish cron would mark it failed anyway; surfacing
  // it here gives the user a clearer error in the queue UI.
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();
  if (!project) {
    return { ok: false, error: "Project not found", retryable: false };
  }
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("id")
    .eq("user_id", project.user_id)
    .eq("platform", channel)
    .maybeSingle();
  if (!account) {
    return {
      ok: false,
      error: `No connected ${channel} account — reconnect from Settings → Integrations.`,
      retryable: false,
    };
  }

  // Insert a scheduled_post row for the publish cron to handle on its
  // next tick. status='pending', scheduled_for=now means the post fires
  // within the next 5-minute window.
  const { data: scheduled, error: schedErr } = await supabase
    .from("scheduled_posts")
    .insert({
      asset_id: assetId,
      project_id: projectId,
      channel,
      scheduled_for: new Date().toISOString(),
      status: "pending",
    })
    .select("id")
    .single();

  if (schedErr || !scheduled) {
    return {
      ok: false,
      error: schedErr?.message ?? "Could not enqueue publish",
    };
  }

  return {
    ok: true,
    result: {
      scheduled_post_id: scheduled.id,
      channel,
    },
  };
};

registerHandler("playbook_action", handler);

export default handler;
