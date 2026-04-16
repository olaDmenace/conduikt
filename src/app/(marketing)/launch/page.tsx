import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  Search,
  PenTool,
  Zap,
  Sparkles,
  Target,
  Mail,
  Map,
  Flag,
  Key,
  TrendingUp,
  FileText,
  Smartphone,
  CheckCircle2,
  Globe,
  Rocket,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";

export const metadata: Metadata = {
  title: "Conduikt Launch — 10 AI Marketing Agents",
  description:
    "Conduikt connects to your website, runs SEO audits, and deploys 10 AI agents to generate, publish, and optimize your marketing. Built for founders who'd rather build than write copy.",
  alternates: { canonical: "https://conduikt.com/launch/" },
  openGraph: {
    title: "Conduikt Launch — 10 AI Marketing Agents",
    description:
      "Conduikt connects to your website, runs SEO audits, and deploys 10 AI agents to generate, publish, and optimize your marketing. Built for founders who'd rather build than write copy.",
    url: "https://conduikt.com/launch/",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
    { "@type": "ListItem", position: 2, name: "Launch", item: "https://conduikt.com/launch/" },
  ],
};

const iconMap: Record<string, typeof Search> = {
  Search,
  Target,
  PenTool,
  Smartphone,
  Mail,
  Map,
  Flag,
  FileText,
  Key,
  TrendingUp,
  Zap,
};

const valueProps = [
  {
    icon: Search,
    title: "Audit",
    description:
      "Connect your website. Get a comprehensive SEO and CRO analysis with specific, actionable fixes.",
  },
  {
    icon: Sparkles,
    title: "Generate",
    description:
      "10 specialized AI agents create blog posts, social content, email sequences, copy, and strategy.",
  },
  {
    icon: Rocket,
    title: "Publish",
    description:
      "Schedule and publish directly to X, LinkedIn, and email. One dashboard for all channels.",
  },
];

export default function LaunchPage() {
  const activeAgents = AGENT_REGISTRY.filter((a) => a.status === "active");

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Hero */}
      <section className="pt-8 pb-24 relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge className="mb-6 animate-in">Launching on Product Hunt</Badge>
          <h1 className="text-hero text-text-primary leading-[1.1] animate-in" style={{ animationDelay: "60ms" }}>
            10 AI Marketing Agents.
            <br />
            <span className="text-accent">One Platform.</span>
            <br />
            Zero Busywork.
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto animate-in" style={{ animationDelay: "120ms" }}>
            Conduikt connects to your website, runs SEO audits, and deploys
            specialized AI agents to generate, publish, and optimize your
            marketing — automatically.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 animate-in" style={{ animationDelay: "180ms" }}>
            <Button size="lg" asChild>
              <Link href="/signup">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/#features">See Features</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-small text-text-tertiary animate-in" style={{ animationDelay: "240ms" }}>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Free tier — no credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              5 AI generations included
            </span>
          </div>
        </div>
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-60 w-[600px] rounded-full bg-accent/8 blur-[80px]" />
      </section>

      {/* Value Props: Audit → Generate → Publish */}
      <section className="py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, i) => (
              <Card
                key={prop.title}
                className="animate-in text-center"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex flex-col items-center py-8">
                  <div className="mb-4 rounded-xl bg-accent-muted p-4">
                    <prop.icon className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-h2 text-text-primary mb-2">
                    {prop.title}
                  </h3>
                  <p className="text-body text-text-secondary">
                    {prop.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Showcase */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-h1 text-text-primary">
              Meet Your AI Marketing Team
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              10 specialized agents — each trained for a specific marketing task.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {activeAgents.map((agent, i) => {
              const Icon = iconMap[agent.icon] || Sparkles;
              return (
                <Card
                  key={agent.id}
                  className="animate-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <CardContent className="flex flex-col items-center text-center py-5 px-3">
                    <div className="mb-3 rounded-lg bg-surface-2 p-2.5">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <p className="text-small font-medium text-text-primary leading-tight">
                      {agent.shortName}
                    </p>
                    <p className="text-[0.6875rem] text-text-tertiary mt-1 leading-snug">
                      {agent.description.slice(0, 50)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Maker's Story */}
      <section className="py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-3xl px-6">
          <Card className="animate-in">
            <CardContent className="py-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-lg shrink-0">
                  OA
                </div>
                <div>
                  <h3 className="text-h3 text-text-primary">
                    Olayinka Fagbenro
                  </h3>
                  <p className="text-small text-text-secondary">
                    Founder, Technicity Digital
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Globe className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="text-small text-text-tertiary">
                      Lagos, Nigeria
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-body text-text-secondary leading-relaxed">
                &quot;I built Conduikt because I was tired of juggling 6
                different marketing tools. As a solo founder, I needed
                something that could audit my site, generate content that
                actually sounds like my brand, and publish across channels
                — without hiring a marketing team.
              </p>
              <p className="text-body text-text-secondary leading-relaxed mt-3">
                Conduikt replaces all of that with 10 specialized AI agents
                that work together. The secret sauce is the feedback loop:
                performance data from published content feeds back into the
                AI, so every generation is smarter than the last. Built
                entirely with Claude Code.&quot;
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-hero text-text-primary">
            Your marketing team is ready.
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Start free. No credit card required. 5 AI generations included.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center">
            <a
              href="https://www.producthunt.com/products/conduikt?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-conduikt"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1119957&theme=dark"
                alt="Conduikt - Paste your website → get marketing content in 20 seconds | Product Hunt"
                width={250}
                height={54}
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
