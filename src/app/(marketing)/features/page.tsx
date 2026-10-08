import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles, Globe, TrendingUp, Mail, Shield, Zap, Calendar, FileText, Users, Code } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { AI_AGENT_COUNT } from "@/src/lib/ai/agents/display";

export const metadata: Metadata = {
  title: `Features — ${AI_AGENT_COUNT} AI Marketing Agents for SEO, Content & Publishing`,
  description:
    "Explore Conduikt's AI marketing features: SEO audits, CRO analysis, AI copywriting, social content, email marketing campaigns, campaign orchestration, closed-loop analytics, and multi-channel publishing.",
  alternates: { canonical: "https://conduikt.com/features/" },
  openGraph: {
    title: `Features — ${AI_AGENT_COUNT} AI Marketing Agents for SEO, Content & Publishing`,
    description:
      "Explore Conduikt's AI marketing features: SEO audits, CRO analysis, AI copywriting, social content, email marketing campaigns, campaign orchestration, closed-loop analytics, and multi-channel publishing.",
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
      { icon: BarChart3, title: "Site audits", detail: "Comprehensive technical and on-page analysis. Get specific fixes with code snippets, not generic advice." },
      { icon: TrendingUp, title: "Conversion checks", detail: "Conversion rate optimization for any page. Headlines, CTAs, social proof, friction — all analyzed with AI." },
      { icon: Code, title: "Schema markup", detail: "Auto-generate JSON-LD structured data for better search appearance and rich snippets." },
    ],
  },
  {
    title: "Generate",
    description: "Create high-converting marketing assets at scale",
    features: [
      { icon: Sparkles, title: "Copywriting", detail: "Headlines, body copy, CTAs — written in your brand voice with conversion psychology baked in." },
      { icon: FileText, title: "Social posts", detail: "A week of X and LinkedIn posts in seconds. Platform-optimized with hooks, formatting, and timing." },
      { icon: Mail, title: "Email sequences", detail: "Welcome, nurture, launch, and re-engagement sequences. AI writes the copy and you send broadcasts to your audience without leaving Conduikt." },
    ],
  },
  {
    title: "Orchestrate",
    description: "Chain actions into automated campaigns",
    features: [
      { icon: Shield, title: "Campaign builder", detail: "Visual flow builder that chains audit, strategy, content, and publish into automated workflows." },
      { icon: Calendar, title: "Content calendar", detail: "Schedule posts across X and LinkedIn. Visual calendar with drag-and-drop rescheduling." },
      { icon: Globe, title: "Posting to every channel", detail: "Schedule social posts to X and LinkedIn, send email broadcasts to your audience, and preview every piece before it ships — all from one dashboard." },
    ],
  },
  {
    title: "Learn",
    description: "Get smarter with every campaign",
    features: [
      { icon: TrendingUp, title: "Analytics dashboard", detail: "Track impressions, clicks, and conversions across every channel in one unified view." },
      { icon: Zap, title: "Learns from what worked", detail: "Engagement data from every post automatically feeds back into the AI's context. The loop tightens with every week of publishing — no manual prompt-tuning required." },
      { icon: Users, title: "Team collaboration", detail: "Invite team members with role-based access. Perfect for agencies managing multiple clients." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-6 pt-16 md:px-10 md:pt-24">
        <div className="flex max-w-[760px] flex-col gap-4">
          <p className="text-label text-accent">Features</p>
          <h1 className="text-display-m text-text">AI marketing, built for humans</h1>
          <p className="text-lg leading-relaxed text-text-2">
            Every feature is designed to help you ship more marketing with less effort.
          </p>
        </div>
      </section>

      {featureGroups.map((group, gi) => {
        const ink = gi % 2 === 1;
        return (
          <section key={group.title} className={ink ? "band-ink" : undefined}>
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-14 md:px-10 md:py-[72px]">
              <div className="flex max-w-[760px] flex-col gap-3">
                <p className={ink ? "text-label text-ink-accent" : "text-label text-accent"}>
                  {String(gi + 1).padStart(2, "0")}
                </p>
                <h2 className={ink ? "text-display-s text-ink-text" : "text-display-s text-text"}>{group.title}</h2>
                <p className={ink ? "text-lg text-ink-text-2" : "text-lg text-text-2"}>{group.description}</p>
              </div>
              <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                {group.features.map((feature, fi) => (
                  <li
                    key={feature.title}
                    className={
                      ink
                        ? "animate-in flex flex-col gap-3 rounded-lg border border-ink-line bg-ink-surface p-6"
                        : "animate-in flex flex-col gap-3 rounded-lg border border-line bg-surface p-6"
                    }
                    style={{ animationDelay: `${fi * 60}ms` }}
                  >
                    <feature.icon className={ink ? "h-5 w-5 text-ink-accent" : "h-5 w-5 text-accent"} />
                    <h3 className={ink ? "text-title text-ink-text" : "text-title text-text"}>{feature.title}</h3>
                    <p className={ink ? "text-body text-ink-text-2" : "text-body text-text-2"}>{feature.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-5 px-4 py-16 md:px-10 md:py-24">
        <h2 className="max-w-[760px] text-display-s text-text">
          Try every agent on your own site.
        </h2>
        <p className="max-w-[560px] text-lg leading-relaxed text-text-2">
          {AI_AGENT_COUNT} agents. Free to start, no credit card.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">Start free<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </section>
    </div>
  );
}
