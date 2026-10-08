"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Zap,
  Sparkles,
  CreditCard,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import {
  PLAN_PRICING,
  GENERATION_LIMITS,
  isUnlimited,
  type PlanTier,
} from "@/src/lib/plans";
import { AI_AGENT_COUNT, aiAgentCountForTier } from "@/src/lib/ai/agents/display";

interface Profile {
  id: string;
  email: string;
  plan: string;
  generation_count: number;
  payment_provider: string | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
}

const plans: {
  key: PlanTier;
  name: string;
  features: string[];
}[] = [
  {
    key: "free",
    name: "Free",
    features: [
      "1 project",
      "5 pieces of content a month",
      "Basic audit",
      "1 audience, 50 marketing emails/mo",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    features: [
      "5 projects",
      "250 pieces of content a month",
      `${aiAgentCountForTier("pro")} AI agents`,
      "Multi-channel publishing",
      "3 audiences, 10K marketing emails/mo + custom domain",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    features: [
      "15 projects",
      "500 pieces of content a month",
      `All ${AI_AGENT_COUNT} AI agents + calendar`,
      "Analytics feedback loop",
      "10 audiences, 50K marketing emails/mo",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    features: [
      "Unlimited projects",
      "No monthly content limit",
      `All ${AI_AGENT_COUNT} AI agents + client reports`,
      "White-label reports",
      "API access",
      "Unlimited audiences, 200K marketing emails/mo",
    ],
  },
];

const POLL_TIMEOUT = 30_000;
const POLL_INTERVAL = 2_000;

function BillingContent() {
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("payment") === "success";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(justPaid);
  const [upgraded, setUpgraded] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlanRef = useRef<string | null>(null);

  async function fetchProfile(): Promise<Profile | null> {
    const res = await fetch("/api/profile");
    if (!res.ok) return null;
    return res.json();
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  }

  function startPolling() {
    setVerifying(true);

    pollRef.current = setInterval(async () => {
      const data = await fetchProfile();
      if (!data) return;
      if (
        prevPlanRef.current !== null &&
        data.plan !== prevPlanRef.current
      ) {
        setProfile(data);
        setVerifying(false);
        setUpgraded(true);
        stopPolling();
        window.history.replaceState({}, "", "/settings/billing");
      }
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setVerifying(false);
      fetchProfile().then((data) => {
        if (data) setProfile(data);
      });
      window.history.replaceState({}, "", "/settings/billing");
    }, POLL_TIMEOUT);
  }

  useEffect(() => {
    fetchProfile().then((data) => {
      if (data) {
        setProfile(data);
        prevPlanRef.current = data.plan;
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!justPaid || loading) return;
    startPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPaid, loading]);

  async function handleUpgrade(planKey: PlanTier) {
    if (!profile) return;
    setCheckoutLoading(planKey);
    setError(null);

    try {
      const res = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initialize payment");
      }

      const { checkout_url } = (await res.json()) as { checkout_url?: string };
      if (!checkout_url) throw new Error("No checkout URL returned");

      prevPlanRef.current = profile.plan;

      // Flutterwave uses a hosted checkout redirect. User returns to
      // /settings/billing?payment=success which triggers polling to confirm
      // the webhook has landed and the plan has been updated.
      window.location.href = checkout_url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setCheckoutLoading(null);
    }
  }

  const currentPlan = (profile?.plan ?? "free") as PlanTier;
  const genCount = profile?.generation_count ?? 0;
  const genLimit = GENERATION_LIMITS[currentPlan];
  const unlimited = isUnlimited(genLimit);
  const remaining = unlimited ? Infinity : Math.max(0, genLimit - genCount);

  const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

  return (
    <div>
      <PageHeader title="Billing" description="Your plan, what you've used, and upgrades." />

      {upgraded && (
        <div role="status" className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-teal-soft px-5 py-4 animate-in">
          <Sparkles className="h-5 w-5 shrink-0 text-teal" aria-hidden />
          <div>
            <p className="text-title text-teal">
              Welcome to {planName}
            </p>
            <p className="text-body-s text-text-2">
              Your plan has been upgraded. Your new limits apply now.
            </p>
          </div>
        </div>
      )}

      {verifying && !upgraded && (
        <div role="status" className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-accent-soft px-5 py-4 animate-in">
          <span className="live-dot" aria-hidden />
          <div>
            <p className="text-title text-text">
              Checking your payment…
            </p>
            <p className="text-body-s text-text-2">
              This usually takes a few seconds. Your plan will update
              on its own.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-line bg-surface-2 px-5 py-4">
          <p className="text-body-s text-danger">{error}</p>
          <p className="mt-1 text-body-s text-text-2">Pick a plan below to try again.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-6" role="status" aria-label="Loading billing">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Current plan summary */}
          <div className="mb-6">
            <Card className="animate-in flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-heading text-text">
                    {planName} plan
                  </h2>
                  <Badge variant={currentPlan}>
                    Current
                  </Badge>
                </div>
                <p className="mt-1 text-body-s text-text-2">
                  {genCount} of{" "}
                  {unlimited ? "unlimited" : genLimit} pieces of
                  content used this period
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-text-3" aria-hidden />
                <span className="text-numeric text-[32px] text-text">
                  {unlimited ? "Unlimited" : remaining}
                </span>
                {!unlimited && <span className="text-label text-text-3">left</span>}
              </div>
            </Card>
          </div>

          {/* Usage bar */}
          {!unlimited && (
            <div className="mb-8">
              <Card
                className="animate-in"
                style={{ animationDelay: "60ms" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-label text-text-3">
                    Content used
                  </span>
                  <span className="font-mono text-caption text-text-3">
                    {genCount}/{genLimit}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-teal transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, (genCount / genLimit) * 100)}%`,
                    }}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Plans grid: items-stretch so cards in the same row share
              height, and each card is a flex column so its button pins
              to the bottom regardless of feature count. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
            {plans.map((plan, i) => {
              const isCurrent = plan.key === currentPlan;
              const currentIdx = plans.findIndex(
                (p) => p.key === currentPlan
              );
              const planIdx = plans.findIndex(
                (p) => p.key === plan.key
              );
              const isDowngrade = currentIdx > planIdx;
              const isUpgrade = planIdx > currentIdx;
              const price = PLAN_PRICING[plan.key];
              const isLoading = checkoutLoading === plan.key;

              return (
                <Card
                  key={plan.key}
                  emphasis={isCurrent}
                  className="animate-in flex h-full flex-col"
                  style={{ animationDelay: `${(i + 2) * 60}ms` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-title text-text">
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <Badge variant="success">Current</Badge>
                    )}
                  </div>
                  <div className="mb-4 flex items-baseline gap-1">
                    <span className="text-numeric text-[40px] text-text">
                      {price.label}
                    </span>
                    <span className="text-body-s text-text-3">
                      /mo
                    </span>
                  </div>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-body-s text-text-2"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {/* mt-auto pins the button to the bottom of the flex
                      column so all four cards line up. */}
                  <div className="mt-auto">
                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        Current plan
                      </Button>
                    ) : plan.key === "free" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        {isDowngrade
                          ? "Contact support"
                          : "Free tier"}
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        disabled={isLoading || verifying}
                        onClick={() => handleUpgrade(plan.key)}
                      >
                        {isLoading ? (
                          "Opening checkout…"
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Upgrade
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        Contact support
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Info */}
          <p
            className="mt-8 max-w-[64ch] animate-in text-body-s text-text-2"
            style={{ animationDelay: "360ms" }}
          >
            Payments are processed securely by Flutterwave in USD. You
            can upgrade your plan at any time. To downgrade or cancel,
            email us at{" "}
            <a
              href="mailto:hello@conduikt.com"
              className="hover-link text-accent hover:text-accent-hover"
            >
              hello@conduikt.com
            </a>
            . Content limits reset on each billing cycle.
          </p>
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" role="status" aria-label="Loading billing">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
