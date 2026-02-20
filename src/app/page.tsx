"use client";

import Link from "next/link";
import {
  ArrowRight,
  Zap,
  BarChart3,
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Sparkles,
  TrendingUp,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

const features = [
  {
    icon: BarChart3,
    title: "AI-Powered SEO Audits",
    description:
      "Get a comprehensive technical and on-page SEO analysis with specific, actionable fixes — not generic best practices.",
  },
  {
    icon: Sparkles,
    title: "Smart Content Generation",
    description:
      "Generate conversion-focused copy, social posts, and email sequences that actually sound like your brand.",
  },
  {
    icon: Globe,
    title: "Multi-Channel Publishing",
    description:
      "Publish directly to X, LinkedIn, and email platforms. One dashboard for all your marketing channels.",
  },
  {
    icon: TrendingUp,
    title: "Analytics Feedback Loop",
    description:
      "Performance data feeds back into AI to improve future generations. Your marketing gets smarter over time.",
  },
  {
    icon: Mail,
    title: "Email Sequence Builder",
    description:
      "Create automated welcome, nurture, and launch email flows. AI writes the copy, you set the triggers.",
  },
  {
    icon: Shield,
    title: "Campaign Orchestration",
    description:
      "Chain audits, strategy, content, and publishing into automated campaigns. Set it up once, let it run.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with basic tools",
    features: [
      "1 project",
      "Basic SEO audit",
      "5 AI generations/month",
      "Manual publishing",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    description: "For serious marketers",
    features: [
      "3 projects",
      "Full audit suite",
      "100 AI generations/month",
      "Multi-channel publishing",
      "Email sequences",
      "Content calendar",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Growth",
    price: "$99",
    description: "For scaling teams",
    features: [
      "10 projects",
      "Analytics feedback loop",
      "Unlimited generations",
      "A/B test setup",
      "Campaign orchestrator",
      "Priority support",
    ],
    cta: "Start Growth Trial",
    popular: false,
  },
  {
    name: "Agency",
    price: "$249",
    description: "For agencies managing clients",
    features: [
      "Unlimited projects",
      "Multi-client management",
      "White-label reports",
      "Team seats",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border-subtle bg-surface-0/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
              <span className="text-sm font-bold text-surface-0">C</span>
            </div>
            <span className="font-display text-lg text-text-primary">
              Conduikt
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/compare/jasper"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Compare
            </Link>
            <Link
              href="/launch"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Launch
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-in">
              <Badge className="mb-6">Now in Beta</Badge>
              <h1 className="text-hero text-text-primary leading-[1.1]">
                Connect your site.
                <br />
                <span className="text-accent">Get a marketing team</span>
                <br />
                that never sleeps.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-text-secondary max-w-lg">
                Conduikt turns AI marketing intelligence into a visual platform.
                Audit, generate, orchestrate, and publish marketing assets across
                every channel — automatically.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/features">See How It Works</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-small text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  5 free AI generations
                </span>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="animate-in relative" style={{ animationDelay: "120ms" }}>
              <div className="rounded-xl border border-border-default bg-surface-1 p-4 shadow-[var(--shadow-elevated)] transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="rounded-lg bg-surface-0 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-error/60" />
                      <div className="h-3 w-3 rounded-full bg-warning/60" />
                      <div className="h-3 w-3 rounded-full bg-success/60" />
                    </div>
                    <div className="skeleton h-3 w-32" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg bg-surface-1 border border-border-default p-3 text-center">
                      <p className="text-2xl font-mono font-bold text-accent">87</p>
                      <p className="text-[0.6875rem] text-text-tertiary mt-1">SEO Score</p>
                    </div>
                    <div className="rounded-lg bg-surface-1 border border-border-default p-3 text-center">
                      <p className="text-2xl font-mono font-bold text-success">92</p>
                      <p className="text-[0.6875rem] text-text-tertiary mt-1">CRO Score</p>
                    </div>
                    <div className="rounded-lg bg-surface-1 border border-border-default p-3 text-center">
                      <p className="text-2xl font-mono font-bold text-info">24</p>
                      <p className="text-[0.6875rem] text-text-tertiary mt-1">Assets</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="skeleton h-8 w-full" />
                    <div className="skeleton h-8 w-4/5" />
                    <div className="skeleton h-8 w-3/5" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
              <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-accent-secondary/10 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Channel Badges */}
      <section className="py-12 border-y border-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-caption text-text-tertiary mb-6">
            Publish everywhere from one dashboard
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              { icon: Twitter, name: "X / Twitter" },
              { icon: Linkedin, name: "LinkedIn" },
              { icon: Mail, name: "Email" },
              { icon: Globe, name: "Your Website" },
            ].map((channel) => (
              <div key={channel.name} className="flex items-center gap-2 text-text-secondary">
                <channel.icon className="h-5 w-5" />
                <span className="text-small font-medium">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-text-primary">
              Everything you need to automate marketing
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              From SEO audits to social publishing, Conduikt handles the entire
              marketing workflow so you can focus on building.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card key={feature.title} hover className="animate-in" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent>
                  <div className="mb-4 rounded-lg bg-accent-muted p-3 w-fit">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-h3 text-text-primary">{feature.title}</h3>
                  <p className="mt-2 text-body text-text-secondary">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-text-primary">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-text-secondary">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <Card
                key={tier.name}
                className={`animate-in relative ${tier.popular ? "border-accent shadow-[0_0_30px_var(--accent-glow)]" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <h3 className="text-h3 text-text-primary">{tier.name}</h3>
                  <p className="text-small text-text-secondary mt-1">{tier.description}</p>
                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-bold font-mono text-text-primary">{tier.price}</span>
                    <span className="text-text-tertiary text-small">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-small text-text-secondary">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant={tier.popular ? "primary" : "secondary"} className="w-full" asChild>
                    <Link href="/signup">{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-h1 text-text-primary">Ready to automate your marketing?</h2>
          <p className="mt-4 text-lg text-text-secondary">
            Join founders and marketers who are using AI to 10x their output.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-accent to-[#C88550]">
              <span className="text-[0.625rem] font-bold text-surface-0">C</span>
            </div>
            <span className="text-small text-text-secondary">Conduikt by Technicity Digital</span>
          </div>
          <div className="flex items-center gap-6 text-small text-text-tertiary">
            <Link href="/compare/jasper" className="hover:text-text-secondary transition-colors">Compare</Link>
            <Link href="/guides/social-media-marketing" className="hover:text-text-secondary transition-colors">Guides</Link>
            <Link href="/launch" className="hover:text-text-secondary transition-colors">Launch</Link>
          </div>
          <p className="text-small text-text-tertiary">Built with Claude Code in Lagos, Nigeria</p>
        </div>
      </footer>
    </div>
  );
}
