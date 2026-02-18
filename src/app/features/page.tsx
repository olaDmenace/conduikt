"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles, Globe, TrendingUp, Mail, Shield, Zap, Calendar, FileText, Users, Code } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

const featureGroups = [
  {
    title: "Analyze",
    description: "Understand what's working and what needs fixing",
    features: [
      { icon: BarChart3, title: "SEO Audits", detail: "Comprehensive technical and on-page analysis. Get specific fixes with code snippets, not generic advice." },
      { icon: TrendingUp, title: "CRO Analysis", detail: "Conversion rate optimization for any page. Headlines, CTAs, social proof, friction — all analyzed with AI." },
      { icon: Code, title: "Schema Markup", detail: "Auto-generate JSON-LD structured data for better search appearance and rich snippets." },
    ],
  },
  {
    title: "Generate",
    description: "Create high-converting marketing assets at scale",
    features: [
      { icon: Sparkles, title: "AI Copywriting", detail: "Headlines, body copy, CTAs — written in your brand voice with conversion psychology baked in." },
      { icon: FileText, title: "Social Content", detail: "A week of X and LinkedIn posts in seconds. Platform-optimized with hooks, formatting, and timing." },
      { icon: Mail, title: "Email Sequences", detail: "Welcome, nurture, launch, re-engagement flows. AI writes the copy, you set the triggers." },
    ],
  },
  {
    title: "Orchestrate",
    description: "Chain actions into automated campaigns",
    features: [
      { icon: Shield, title: "Campaign Builder", detail: "Visual flow builder that chains audit, strategy, content, and publish into automated workflows." },
      { icon: Calendar, title: "Content Calendar", detail: "Schedule posts across X, LinkedIn, and email. Visual calendar with drag-and-drop rescheduling." },
      { icon: Globe, title: "Multi-Channel Publishing", detail: "One dashboard for all channels. Preview how content looks on each platform before publishing." },
    ],
  },
  {
    title: "Learn",
    description: "Get smarter with every campaign",
    features: [
      { icon: TrendingUp, title: "Analytics Dashboard", detail: "Track impressions, clicks, and conversions across every channel in one unified view." },
      { icon: Zap, title: "Feedback Loop", detail: "Performance data feeds back into AI context. Every generation is better than the last." },
      { icon: Users, title: "Team Collaboration", detail: "Invite team members with role-based access. Perfect for agencies managing multiple clients." },
    ],
  },
];

export default function FeaturesPage() {
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
        <div className="text-center mb-20">
          <h1 className="text-hero text-text-primary">AI marketing, built for humans</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Every feature is designed to help you ship more marketing with less effort.
          </p>
        </div>

        {featureGroups.map((group) => (
          <div key={group.title} className="mb-20">
            <div className="mb-8">
              <h2 className="text-h1 text-text-primary">{group.title}</h2>
              <p className="mt-2 text-lg text-text-secondary">{group.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {group.features.map((feature, fi) => (
                <Card key={feature.title} className="animate-in" style={{ animationDelay: `${fi * 60}ms` }}>
                  <CardContent>
                    <div className="mb-4 rounded-lg bg-accent-muted p-3 w-fit">
                      <feature.icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-h3 text-text-primary">{feature.title}</h3>
                    <p className="mt-2 text-body text-text-secondary">{feature.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center py-12">
          <Button size="lg" asChild>
            <Link href="/signup">Start Free<ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
