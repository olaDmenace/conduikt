"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Zap, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";

interface Profile {
  id: string;
  plan: string;
  generation_count: number;
  lemon_squeezy_customer_id: string | null;
  lemon_squeezy_subscription_id: string | null;
}

const plans = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    features: ["1 project", "5 AI generations/month", "Basic audit"],
    checkoutParam: null, // No checkout for free
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    features: [
      "3 projects",
      "100 generations/month",
      "Multi-channel publishing",
    ],
    checkoutParam: process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_PRO,
  },
  {
    key: "growth",
    name: "Growth",
    price: "$99",
    features: [
      "10 projects",
      "Unlimited generations",
      "Analytics feedback loop",
    ],
    checkoutParam: process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_GROWTH,
  },
  {
    key: "agency",
    name: "Agency",
    price: "$249",
    features: [
      "Unlimited projects",
      "Team seats",
      "White-label reports",
      "API access",
    ],
    checkoutParam: process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_AGENCY,
  },
];

const limits: Record<string, number> = {
  free: 5,
  pro: 100,
  growth: 999999,
  agency: 999999,
};

const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  growth: "Growth",
  agency: "Agency",
};

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const currentPlan = profile?.plan ?? "free";
  const genCount = profile?.generation_count ?? 0;
  const genLimit = limits[currentPlan] ?? 5;
  const remaining = Math.max(0, genLimit - genCount);

  function getCheckoutUrl(plan: (typeof plans)[number]) {
    if (!plan.checkoutParam || !profile?.id) return null;
    // Lemon Squeezy checkout URL with custom data for webhook user identification
    return `${plan.checkoutParam}?checkout[custom][user_id]=${profile.id}`;
  }

  const portalUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_PORTAL_URL;

  return (
    <div>
      <PageHeader title="Billing" description="Manage your subscription" />

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
                      {planLabels[currentPlan]} Plan
                    </h3>
                    <Badge
                      variant={currentPlan === "free" ? "secondary" : "success"}
                    >
                      Current
                    </Badge>
                  </div>
                  <p className="mt-1 text-small text-text-secondary">
                    {genCount} of {genLimit === 999999 ? "unlimited" : genLimit}{" "}
                    AI generations used this period
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-accent" />
                      <span className="text-data text-accent">
                        {genLimit === 999999 ? "Unlimited" : remaining} remaining
                      </span>
                    </div>
                  </div>
                  {profile?.lemon_squeezy_subscription_id && portalUrl && (
                    <Button variant="secondary" size="sm" asChild>
                      <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                        Manage Subscription
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Bar */}
          {genLimit !== 999999 && (
            <div className="mb-8">
              <Card className="animate-in" style={{ animationDelay: "60ms" }}>
                <CardContent className="py-5">
                  <div className="flex items-center justify-between text-small mb-2">
                    <span className="text-text-secondary">Generation Usage</span>
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
              const isDowngrade =
                plans.findIndex((p) => p.key === currentPlan) >
                plans.findIndex((p) => p.key === plan.key);
              const checkoutUrl = getCheckoutUrl(plan);

              return (
                <Card
                  key={plan.key}
                  className={`animate-in ${isCurrent ? "border-accent" : ""}`}
                  style={{ animationDelay: `${(i + 2) * 60}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-h3 text-text-primary">{plan.name}</h3>
                      {isCurrent && <Badge variant="success">Current</Badge>}
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold font-mono text-text-primary">
                        {plan.price}
                      </span>
                      <span className="text-text-tertiary text-small">/mo</span>
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
                      <Button variant="secondary" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : plan.key === "free" ? (
                      // Can't "buy" free — managed via portal cancel
                      <Button variant="secondary" className="w-full" disabled={isDowngrade}>
                        {isDowngrade ? "Downgrade via Portal" : "Free Tier"}
                      </Button>
                    ) : checkoutUrl ? (
                      <Button className="w-full" asChild>
                        <a
                          href={checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {isDowngrade ? "Change Plan" : "Upgrade"}
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        Coming Soon
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* FAQ / Info */}
          <div className="mt-8">
            <Card className="animate-in" style={{ animationDelay: "360ms" }}>
              <CardContent className="py-5">
                <p className="text-small text-text-secondary">
                  Subscriptions are managed through Lemon Squeezy. You can upgrade,
                  downgrade, or cancel your plan at any time through the customer
                  portal. Generation limits reset on each billing cycle.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
