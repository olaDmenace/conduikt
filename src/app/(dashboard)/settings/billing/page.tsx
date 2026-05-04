"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Zap,
  Loader2,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import {
  PLAN_PRICING,
  GENERATION_LIMITS,
  isUnlimited,
  type PlanTier,
} from "@/src/lib/plans";

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
      "5 AI generations/month",
      "Basic audit",
      "1 audience, 50 marketing emails/mo",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    features: [
      "5 projects",
      "250 generations/month",
      "10 AI agents",
      "Multi-channel publishing",
      "3 audiences, 10K marketing emails/mo + custom domain",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    features: [
      "15 projects",
      "500 generations/month",
      "14 AI agents",
      "Analytics feedback loop",
      "10 audiences, 50K marketing emails/mo",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    features: [
      "Unlimited projects",
      "Unlimited generations",
      "15 AI agents",
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

  return (
    <div>
      <PageHeader title="Billing" description="Manage your subscription" />

      {upgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 px-5 py-4 animate-in">
          <Sparkles className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="text-small font-medium text-success">
              Welcome to {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}!
            </p>
            <p className="text-small text-text-secondary">
              Your plan has been upgraded. Enjoy your new limits.
            </p>
          </div>
        </div>
      )}

      {verifying && !upgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-5 py-4 animate-in">
          <Loader2 className="h-5 w-5 text-accent shrink-0 animate-spin" />
          <div>
            <p className="text-small font-medium text-text-primary">
              Verifying your payment...
            </p>
            <p className="text-small text-text-secondary">
              This usually takes a few seconds. Your plan will update
              automatically.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-small text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : (
        <>
          {/* Current Plan Summary */}
          <div className="mb-6">
            <Card className="animate-in">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-h3 text-text-primary">
                      {currentPlan.charAt(0).toUpperCase() +
                        currentPlan.slice(1)}{" "}
                      Plan
                    </h3>
                    <Badge
                      variant={
                        currentPlan === "free" ? "secondary" : "success"
                      }
                    >
                      Current
                    </Badge>
                  </div>
                  <p className="mt-1 text-small text-text-secondary">
                    {genCount} of{" "}
                    {unlimited ? "unlimited" : genLimit} AI
                    generations used this period
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-accent" />
                      <span className="text-data text-accent">
                        {unlimited
                          ? "Unlimited"
                          : `${remaining} remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Bar */}
          {!unlimited && (
            <div className="mb-8">
              <Card
                className="animate-in"
                style={{ animationDelay: "60ms" }}
              >
                <CardContent className="py-5">
                  <div className="flex items-center justify-between text-small mb-2">
                    <span className="text-text-secondary">
                      Generation Usage
                    </span>
                    <span className="text-text-tertiary">
                      {genCount}/{genLimit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (genCount / genLimit) * 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  className={`animate-in ${isCurrent ? "border-accent" : ""}`}
                  style={{ animationDelay: `${(i + 2) * 60}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-h3 text-text-primary">
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <Badge variant="success">Current</Badge>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold font-mono text-text-primary">
                        {price.label}
                      </span>
                      <span className="text-text-tertiary text-small">
                        /mo
                      </span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-small text-text-secondary"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : plan.key === "free" ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                      >
                        {isDowngrade
                          ? "Contact Support"
                          : "Free Tier"}
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        disabled={isLoading || verifying}
                        onClick={() => handleUpgrade(plan.key)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Upgrade
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                      >
                        Contact Support
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info */}
          <div className="mt-8">
            <Card
              className="animate-in"
              style={{ animationDelay: "360ms" }}
            >
              <CardContent className="py-5">
                <p className="text-small text-text-secondary">
                  Payments are processed securely by Flutterwave in USD. You
                  can upgrade your plan at any time. To downgrade or cancel,
                  contact us at{" "}
                  <a
                    href="mailto:hello@conduikt.com"
                    className="text-accent hover:underline"
                  >
                    hello@conduikt.com
                  </a>
                  . Generation limits reset on each billing cycle.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
