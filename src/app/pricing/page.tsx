"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring what AI can do for your marketing.",
    features: ["1 project", "Basic SEO audit + recommendations", "5 AI generations per month", "Manual copy-paste publishing"],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "For founders and marketers ready to scale their output.",
    features: ["3 projects", "Full audit suite (SEO + CRO)", "100 AI generations per month", "Multi-channel publishing (X + LinkedIn)", "Email sequence builder", "Content calendar", "Channel-specific previews"],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Growth",
    price: "$99",
    period: "per month",
    description: "For teams that want AI-driven marketing on autopilot.",
    features: ["10 projects", "Unlimited AI generations", "Analytics feedback loop", "A/B test setup", "Campaign orchestrator", "Programmatic SEO pages", "Priority support"],
    cta: "Start Growth Trial",
    popular: false,
  },
  {
    name: "Agency",
    price: "$249",
    period: "per month",
    description: "For agencies managing multiple client accounts.",
    features: ["Unlimited projects", "Multi-client management", "White-label audit reports", "Team seats with role-based access", "API access", "Dedicated support", "Custom integrations"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface-0 pt-24 pb-20">
      <nav className="fixed top-0 z-50 w-full border-b border-border-subtle bg-surface-0/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
              <span className="text-sm font-bold text-surface-0">C</span>
            </div>
            <span className="font-display text-lg text-text-primary">Conduikt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
            <Button asChild><Link href="/signup">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h1 className="text-hero text-text-primary">Simple pricing</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => (
            <Card
              key={tier.name}
              className={`animate-in relative ${tier.popular ? "border-accent shadow-[0_0_30px_var(--accent-glow)]" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge>Most Popular</Badge></div>
              )}
              <CardContent className="pt-8 flex flex-col h-full">
                <h3 className="text-h2 text-text-primary">{tier.name}</h3>
                <div className="mt-2 mb-2">
                  <span className="text-3xl font-bold font-mono text-text-primary">{tier.price}</span>
                  <span className="text-text-tertiary text-small">/{tier.period}</span>
                </div>
                <p className="text-small text-text-secondary mb-6">{tier.description}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-small text-text-secondary">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant={tier.popular ? "primary" : "secondary"} className="w-full" asChild>
                  <Link href="/signup">{tier.cta}<ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
