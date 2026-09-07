"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Zap } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import {
  getGenerationLimit,
  isUnlimited,
  normalizePlan,
  type PlanTier,
} from "@/src/lib/plans";
import { cn } from "@/src/lib/utils/cn";

interface Props {
  /**
   * Optional tone override — "compact" (single-line pill) is the default and
   * fits above a submit button. "block" produces a fuller card, useful when
   * the badge is standalone in an empty state.
   */
  variant?: "compact" | "block";
  /**
   * How many generations this action will consume. Defaults to 1 which covers
   * all current single-action generate buttons.
   */
  cost?: number;
  className?: string;
}

interface Profile {
  plan: string;
  generation_count: number;
}

/**
 * Proactive quota display shown near AI generation actions.
 *
 * Prevents the "click Generate → hit 403 modal" flow the UX audit called out
 * (Nielsen heuristic #5 · Error Prevention) by making the user's remaining
 * quota visible *before* they click, and surfacing an upgrade path when the
 * pool is low or empty.
 *
 * The component fetches the profile itself so it can be dropped into any
 * generation surface (Content Studio, Blog Writer, Playground, bulk dialog)
 * without prop drilling. Piggybacks on the `conduikt:generation` window event
 * that other pages already dispatch after a successful generation, so the
 * badge updates without a full page refresh.
 */
export function QuotaBadge({ variant = "compact", cost = 1, className }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("plan, generation_count")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();

    function onGeneration() {
      load();
    }
    window.addEventListener("conduikt:generation", onGeneration);
    return () => window.removeEventListener("conduikt:generation", onGeneration);
  }, []);

  if (loading || !profile) return null;

  const plan: PlanTier = normalizePlan(profile.plan);
  const usageCount = profile.generation_count ?? 0;
  const limit = getGenerationLimit(plan);
  const unlimited = isUnlimited(limit);

  if (unlimited) {
    // Unlimited plans still get a tiny confirmation so users don't wonder
    // whether the action is free.
    if (variant === "compact") {
      return (
        <div
          className={cn(
            "flex items-center gap-1.5 text-caption text-text-tertiary",
            className
          )}
        >
          <Zap className="h-3 w-3 shrink-0 text-success" />
          <span>Unlimited generations on {plan}.</span>
        </div>
      );
    }
    return null;
  }

  const remaining = Math.max(0, limit - usageCount);
  const empty = remaining <= 0;
  const low = remaining > 0 && remaining <= Math.max(3, Math.floor(limit * 0.1));
  const willExceed = cost > remaining;

  const tone = empty || willExceed ? "error" : low ? "warning" : "muted";

  const toneClasses = {
    error: "text-error bg-error/10 border-error/30",
    warning: "text-warning bg-warning/10 border-warning/30",
    muted: "text-text-tertiary bg-surface-2 border-border-default",
  }[tone];

  const message = empty
    ? `You're out of generations this month.`
    : willExceed
    ? `This action needs ${cost}. You have ${remaining} left.`
    : cost > 1
    ? `Consumes ${cost} of ${remaining} remaining.`
    : `Consumes 1 of ${remaining} remaining.`;

  if (variant === "block") {
    return (
      <div
        className={cn(
          "rounded-lg border px-3 py-2.5 text-small flex items-start gap-2",
          toneClasses,
          className
        )}
      >
        {(empty || low || willExceed) && (
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {plan !== "agency" && (empty || low || willExceed) && (
            <Link
              href="/settings/billing"
              className="mt-1 inline-block text-caption underline underline-offset-2 hover:no-underline"
            >
              Upgrade for more →
            </Link>
          )}
        </div>
      </div>
    );
  }

  // compact — single line pill above the submit button
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-caption",
        toneClasses,
        className
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {(empty || willExceed) && (
          <AlertTriangle className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate">{message}</span>
      </div>
      {plan !== "agency" && (empty || low || willExceed) && (
        <Link
          href="/settings/billing"
          className="shrink-0 underline underline-offset-2 hover:no-underline"
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
