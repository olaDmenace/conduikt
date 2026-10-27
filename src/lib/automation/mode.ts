// "How hands-on you want to be": the per-project automation mode
// (docs/DESIGN.md Modes band; audit decision D4).
//
// check_all   You approve every piece. Nothing goes out until you tap Approve.
// social_runs Posts go out on schedule; everything else waits for you.
// hands_off   Conduikt publishes on schedule; you can change your mind any time.

import type { SupabaseClient } from "@supabase/supabase-js";

export const AUTOMATION_MODE_IDS = ["check_all", "social_runs", "hands_off"] as const;

export type AutomationMode = (typeof AUTOMATION_MODE_IDS)[number];

export const AUTOMATION_MODES: readonly {
  id: AutomationMode;
  label: string;
  blurb: string;
}[] = [
  {
    id: "check_all",
    label: "Check all",
    blurb: "You approve every piece. Conduikt writes and schedules. Nothing goes out until you tap Approve.",
  },
  {
    id: "social_runs",
    label: "Let social run",
    blurb: "Posts go out, the rest waits for you.",
  },
  {
    id: "hands_off",
    label: "Hands off",
    blurb: "Conduikt publishes on schedule; you can change your mind any time.",
  },
];

export const DEFAULT_AUTOMATION_MODE: AutomationMode = "check_all";

export function isAutomationMode(value: unknown): value is AutomationMode {
  return value === "check_all" || value === "social_runs" || value === "hands_off";
}

/** Anything unknown is the safest mode. */
export function normalizeMode(value: unknown): AutomationMode {
  return isAutomationMode(value) ? value : DEFAULT_AUTOMATION_MODE;
}

/** Channels that "Let social run" lets through without approval. */
const SOCIAL_CHANNELS = new Set(["x", "linkedin", "instagram", "facebook", "tiktok"]);

/**
 * May this channel publish without the owner tapping Approve?
 * hands_off: everything. social_runs: social posts only. check_all: nothing.
 */
export function shouldPublishWithoutApproval(
  mode: AutomationMode | string | null | undefined,
  channel: string
): boolean {
  const m = normalizeMode(mode);
  if (m === "hands_off") return true;
  if (m === "social_runs") return SOCIAL_CHANNELS.has(channel.trim().toLowerCase());
  return false;
}

type ModeClient = Pick<SupabaseClient, "from">;

/** The project's mode, or check_all when the row is missing or unreadable. */
export async function getProjectMode(supabase: ModeClient, projectId: string): Promise<AutomationMode> {
  const { data, error } = await supabase
    .from("projects")
    .select("automation_mode")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data) return DEFAULT_AUTOMATION_MODE;
  return normalizeMode((data as { automation_mode?: unknown }).automation_mode);
}
