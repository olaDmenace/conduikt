import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles, Globe, TrendingUp, Mail, Shield, Zap, Calendar, FileText, Users, Code } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Features — 10 AI Marketing Agents for SEO, Content & Publishing",
  description:
    "Explore Conduikt's AI marketing features: SEO audits, CRO analysis, AI copywriting, social content, email marketing campaigns, campaign orchestration, and multi-channel publishing.",
  alternates: { canonical: "https://conduikt.com/features/" },
  openGraph: {
    title: "Features — 10 AI Marketing Agents for SEO, Content & Publishing",
    description:
      "Explore Conduikt's AI marketing features: SEO audits, CRO analysis, AI copywriting, social content, email marketing campaigns, campaign orchestration, and multi-channel publishing.",
    url: "https://conduikt.com/features/",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://conduikt.com/features/" },
  ],
};

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
      { icon: Mail, title: "Email Sequences", detail: "Welcome, nurture, launch, and re-engagement sequences. AI writes the copy and you send broadcasts to your audience without leaving Conduikt." },
    ],
  },
  {
    title: "Orchestrate",
    description: "Chain actions into automated campaigns",
    features: [
      { icon: Shield, title: "Campaign Builder", detail: "Visual flow builder that chains audit, strategy, content, and publish into automated workflows." },
      { icon: Calendar, title: "Content Calendar", detail: "Schedule posts across X and LinkedIn. Visual calendar with drag-and-drop rescheduling." },
      { icon: Globe, title: "Multi-Channel Publishing", detail: "Schedule social posts to X and LinkedIn, send email broadcasts to your audience, and preview every piece before it ships — all from one dashboard." },
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
    <div className="pt-8 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
