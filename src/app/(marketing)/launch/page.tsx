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
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";
import { AI_AGENT_COUNT, agentDisplay } from "@/src/lib/ai/agents/display";

export const metadata: Metadata = {
  title: `Conduikt Launch — ${AI_AGENT_COUNT} AI Marketing Agents`,
  description:
    `Conduikt connects to your website, runs SEO audits, and deploys ${AI_AGENT_COUNT} AI agents to generate, publish, and optimize your marketing. Built for founders who'd rather build than write copy.`,
  alternates: { canonical: "https://conduikt.com/launch/" },
  openGraph: {
    title: `Conduikt Launch — ${AI_AGENT_COUNT} AI Marketing Agents`,
    description:
      `Conduikt connects to your website, runs SEO audits, and deploys ${AI_AGENT_COUNT} AI agents to generate, publish, and optimize your marketing. Built for founders who'd rather build than write copy.`,
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
      `${AI_AGENT_COUNT} specialized AI agents create blog posts, social content, email sequences, copy, and strategy.`,
  },
  {
    icon: Rocket,
    title: "Publish",
    description:
      "Schedule and publish directly to X and LinkedIn. Email sequences export to your ESP.",
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
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
        <div className="flex max-w-[900px] flex-col gap-6">
          <p className="animate-in text-label text-accent">Launching on Product Hunt</p>
          <h1 className="animate-in text-display-l text-text" style={{ animationDelay: "60ms" }}>
            {AI_AGENT_COUNT} AI marketing agents.{" "}
            <span className="font-medium">One platform. Zero busywork.</span>
          </h1>
          <p className="animate-in max-w-[600px] text-lg leading-relaxed text-text-2" style={{ animationDelay: "120ms" }}>
            Conduikt connects to your website, checks it, and puts
            specialized AI agents to work writing, posting, and improving your
            marketing, automatically.
          </p>
          <div className="animate-in flex flex-wrap items-center gap-3" style={{ animationDelay: "180ms" }}>
            <Button size="lg" asChild>
              <Link href="/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/features">See features</Link>
            </Button>
          </div>
          <div className="animate-in flex flex-wrap items-center gap-6 text-body-s text-text-3" style={{ animationDelay: "240ms" }}>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal" />
              Free plan, no credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal" />
              5 pieces of content included
            </span>
          </div>
        </div>
      </section>

      {/* Value props: Audit, Generate, Publish */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 md:px-10">
        <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {valueProps.map((prop, i) => (
            <li
              key={prop.title}
              className="animate-in flex flex-col gap-3 bg-surface p-7"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-2 text-accent">
                <prop.icon className="h-5 w-5" />
                <span className="text-label text-text-3">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="text-heading text-text">{prop.title}</h2>
              <p className="text-body text-text-2">{prop.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Agent showcase */}
      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-14 md:px-10 md:py-[72px] lg:py-[104px]">
          <div className="flex max-w-[760px] flex-col gap-3">
            <p className="text-label text-ink-accent">The agents</p>
            <h2 className="text-display-m text-ink-text">
              Meet your AI marketing team.
            </h2>
            <p className="text-lg text-ink-text-2">
              {AI_AGENT_COUNT} specialized agents, each trained for one marketing job.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
            {activeAgents.map((agent, i) => {
              const Icon = iconMap[agent.icon] || Sparkles;
              const d = agentDisplay(agent);
              return (
                <li
                  key={agent.id}
                  className="animate-in flex flex-col gap-2 rounded-md border border-ink-line bg-ink-surface p-4"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Icon className="h-4 w-4 text-ink-accent" />
                  <p className="text-body-s font-medium text-ink-text">{d.name}</p>
                  <p className="text-caption text-ink-text-3">{d.job}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Maker's story */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-10 md:py-24">
        <figure className="animate-in flex max-w-[820px] flex-col gap-6 rounded-lg border border-line bg-surface p-7 md:p-10">
          <p className="text-label text-accent">From the maker</p>
          <blockquote className="flex flex-col gap-3 text-[17px] leading-relaxed text-text">
            <p>
              &quot;I built Conduikt because I was tired of juggling 6
              different marketing tools. As a solo founder, I needed
              something that could audit my site, generate content that
              actually sounds like my brand, and publish across channels,
              without hiring a marketing team.
            </p>
            <p>
              Conduikt replaces all of that with {AI_AGENT_COUNT} specialized AI agents
              that work together. The secret sauce is the feedback loop:
              performance data from published content feeds back into the
              AI, so every piece is smarter than the last. Built
              entirely with Claude Code.&quot;
            </p>
          </blockquote>
          <figcaption className="flex items-center gap-3 border-t border-line pt-5">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[13px] text-white"
              aria-hidden
            >
              OA
            </span>
            <div>
              <p className="text-title text-text">Olayinka Fagbenro</p>
              <p className="flex items-center gap-1.5 text-caption text-text-3">
                Founder, Technicity Digital
                <span aria-hidden>·</span>
                <Globe className="h-3 w-3" />
                Lagos, Nigeria
              </p>
            </div>
          </figcaption>
        </figure>
      </section>

      {/* Final CTA */}
      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-6 px-4 py-16 md:px-10 md:py-24">
          <h2 className="max-w-[900px] text-display-m text-ink-text">
            Your marketing team is ready.
          </h2>
          <p className="max-w-[560px] text-lg text-ink-text-2">
            Start free. No credit card required. 5 pieces of content included.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <a
            href="https://www.producthunt.com/products/conduikt?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-conduikt"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2"
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
      </section>
    </div>
  );
}
