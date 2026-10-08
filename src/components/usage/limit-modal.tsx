"use client";

import { useState, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight, Zap } from "@/src/components/ui/lucide-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  normalizePlan,
  PLAN_ORDER,
  GENERATION_LIMITS,
  tierLabel,
  PLAN_PRICING,
  type PlanTier,
} from "@/src/lib/plans";

interface LimitModalState {
  open: boolean;
  plan: PlanTier;
}

interface UsageLimitCtx {
  showLimitModal: (currentPlan?: string) => void;
}

const UsageLimitContext = createContext<UsageLimitCtx>({
  showLimitModal: () => {},
});

export function useUsageLimitModal() {
  return useContext(UsageLimitContext);
}

export function UsageLimitProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LimitModalState>({ open: false, plan: "free" });

  const showLimitModal = useCallback((currentPlan?: string) => {
    setState({ open: true, plan: normalizePlan(currentPlan) });
  }, []);

  const plan = state.plan;
  const planIdx = PLAN_ORDER.indexOf(plan);
  const nextTier: PlanTier | null =
    planIdx < PLAN_ORDER.length - 1 ? PLAN_ORDER[planIdx + 1] : null;

  return (
    <UsageLimitContext.Provider value={{ showLimitModal }}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="warning">
                <Zap className="h-3 w-3" />
                Limit reached
              </Badge>
            </div>
            <DialogTitle>You&apos;ve used all your pieces of content this month</DialogTitle>
            <DialogDescription>
              Your <span className="font-medium capitalize text-text">{plan}</span> plan
              includes {Number.isFinite(GENERATION_LIMITS[plan]) ? GENERATION_LIMITS[plan] : "unlimited"} pieces
              of content a month. Your allowance resets on the 1st of next month.
            </DialogDescription>
          </DialogHeader>

          {nextTier && (
            <div className="mt-2 rounded-md border border-line bg-ground p-4">
              <p className="mb-3 text-body-s text-text-2">
                Upgrade to <span className="font-medium text-text">{tierLabel(nextTier)}</span> for{" "}
                {Number.isFinite(GENERATION_LIMITS[nextTier])
                  ? `${GENERATION_LIMITS[nextTier]} pieces of content a month`
                  : "unlimited pieces of content"}{" "}
                at <span className="font-mono font-medium text-text">{PLAN_PRICING[nextTier].label}/mo</span>.
              </p>
              <Button asChild>
                <Link href="/settings/billing" onClick={() => setState((s) => ({ ...s, open: false }))}>
                  Upgrade to {tierLabel(nextTier)}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}

          {!nextTier && (
            <p className="mt-2 text-body-s text-text-2">
              You&apos;re on the highest plan. Your allowance resets on the 1st of next month.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </UsageLimitContext.Provider>
  );
}
