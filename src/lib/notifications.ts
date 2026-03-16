import { createServiceClient } from "@/src/lib/supabase/service";

export interface NotificationData {
  type: string;
  title: string;
  body?: string;
  projectId?: string;
  actionUrl?: string;
}

/**
 * Creates a notification for a user. Uses the service client so it works
 * from background jobs (Inngest) and API routes alike.
 */
export async function createNotification(
  userId: string,
  data: NotificationData
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from("notifications").insert({
    user_id: userId,
    project_id: data.projectId || null,
    type: data.type,
    title: data.title,
    body: data.body || null,
    action_url: data.actionUrl || null,
  });
}
