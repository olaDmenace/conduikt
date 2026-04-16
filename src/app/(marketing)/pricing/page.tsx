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
    description: "See what Conduikt can do.",
    features: [
      "3 AI agents (SEO Audit, Social, Keywords)",
      "5 generations / month",
      "1 project",
      "Basic results — critical findings require Pro",
      "Manual copy-paste publishing",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "Everything you need to market your business.",
    features: [
      "10 AI agents — full suite",
      "250 generations / month",
      "5 projects",
      "Full unblurred results on every agent",
      "Growth Playbook included",
      "Multi-channel publishing (X + LinkedIn)",
      "Saved assets library",
      "Email support",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Growth",
    price: "$99",
    period: "per month",
    description: "Execute and optimize at scale.",
    features: [
      "14 AI agents — Pro plus Campaigns, Calendar, A/B Tests, Video Ads",
      "500 generations / month",
      "15 projects",
      "Analytics dashboard with feedback loop",
      "Priority support (24h response)",
    ],
    cta: "Start Growth Trial",
    popular: false,
  },
  {
    name: "Agency",
    price: "$249",
    period: "per month",
    description: "Manage multiple clients from one account.",
    features: [
      "15 AI agents — exclusive Client Reports (white-label PDFs)",
      "Unlimited generations",
      "Unlimited projects",
      "Multi-client workspace",
      "Team seats (up to 5 included)",
      "White-label exports (remove Conduikt branding)",
      "API access",
      "Bulk operations across projects",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="pt-8 pb-20">
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
                  <Link href={tier.name === "Free" ? "/signup" : "/signup?plan=" + tier.name.toLowerCase()}>
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
