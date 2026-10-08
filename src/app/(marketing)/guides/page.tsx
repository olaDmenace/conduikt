import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, BookOpen, Clock } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { AI_AGENT_COUNT } from "@/src/lib/ai/agents/display";

export const metadata: Metadata = {
  title: "AI Marketing Guides — Conduikt",
  description:
    "Practical guides to automating your marketing with AI. Learn how to build SEO content strategies, automate social media, and scale email marketing.",
  alternates: { canonical: "https://conduikt.com/guides/" },
  openGraph: {
    title: "AI Marketing Guides — Conduikt",
    description:
      "Practical guides to automating your marketing with AI. Learn how to build SEO content strategies, automate social media, and scale email marketing.",
    url: "https://conduikt.com/guides/",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
    { "@type": "ListItem", position: 2, name: "Guides", item: "https://conduikt.com/guides/" },
  ],
};

const guides = [
  {
    slug: "social-media-marketing",
    title: "How to Automate Social Media Marketing with AI",
    intro:
      "Social media marketing is time-consuming. Between creating content, scheduling posts, and analyzing performance, it can eat up 10+ hours per week. AI automation changes that equation entirely.",
    readTime: "8 min read",
    sections: 5,
    agentLabel: "Social Agent",
    topics: ["Content calendar", "Platform-specific copy", "Performance feedback loop"],
  },
  {
    slug: "seo-content-strategy",
    title: "How to Build an AI-Powered SEO Content Strategy",
    intro:
      "SEO content strategy used to require expensive consultants and months of planning. AI agents can now audit your site, research keywords, analyze competitors, and generate a full content strategy in minutes.",
    readTime: "10 min read",
    sections: 6,
    agentLabel: "Strategy Agent",
    topics: ["Technical SEO audit", "Keyword clustering", "Content pillars"],
  },
  {
    slug: "email-marketing-automation",
    title: "How to Automate Email Marketing with AI Agents",
    intro:
      "Email marketing remains the highest-ROI channel for most businesses. AI automation lets you create personalized, high-converting email sequences without a dedicated email marketer.",
    readTime: "9 min read",
    sections: 6,
    agentLabel: "Email Agent",
    topics: ["Welcome & nurture flows", "Subject line optimization", "A/B testing"],
  },
];

export default function GuidesIndexPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Hero */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-16 md:px-10 md:pt-24">
        <div className="flex max-w-[760px] flex-col gap-4">
          <p className="text-label text-accent">Guides</p>
          <h1 className="text-display-m text-text">AI marketing guides</h1>
          <p className="text-lg leading-relaxed text-text-2">
            Practical, step-by-step guides to automating your marketing with AI.
            Written for founders and marketers who want results, not theory.
          </p>
        </div>
      </section>

      {/* Guide cards */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-24 md:px-10">
        <ul className="flex flex-col gap-3.5">
          {guides.map((g, i) => (
            <li key={g.slug} className="animate-in" style={{ animationDelay: `${i * 80}ms` }}>
              <Link
                href={`/guides/${g.slug}`}
                className="group hover-card hover-card-quiet flex flex-col gap-5 rounded-lg border border-line bg-surface p-6 md:flex-row md:items-start md:justify-between md:p-7"
              >
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-text-3" />
                    <div className="flex items-center gap-2 text-caption text-text-3">
                      <Clock className="h-3 w-3" />
                      <span>{g.readTime}</span>
                      <span aria-hidden>·</span>
                      <span>{g.sections} sections</span>
                    </div>
                  </div>
                  <h2 className="mb-2 text-heading text-text transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] group-hover:text-accent-hover">
                    {g.title}
                  </h2>
                  <p className="mb-4 max-w-2xl text-body text-text-2">
                    {g.intro}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.topics.map((t) => (
                      <Badge key={t} variant="secondary" className="normal-case">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 text-body-s font-medium text-accent-hover">
                  Read guide
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-5 px-4 py-14 md:px-10 md:py-[72px]">
          <p className="text-label text-ink-accent">Start free</p>
          <h2 className="max-w-[760px] text-display-s text-ink-text">
            Stop reading. Start automating.
          </h2>
          <p className="max-w-[560px] text-lg leading-relaxed text-ink-text-2">
            Conduikt puts all of these strategies into practice with {AI_AGENT_COUNT} AI agents.
            Start free, no credit card required.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
