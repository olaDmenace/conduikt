import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { AI_AGENT_COUNT } from "@/src/lib/ai/agents/display";

export const metadata: Metadata = {
  title: "Conduikt vs Competitors — AI Marketing Tool Comparisons",
  description:
    `See how Conduikt's ${AI_AGENT_COUNT} AI marketing agents compare to Jasper, Copy.ai, Writesonic, and Surfer SEO. Full feature breakdowns and honest analysis.`,
  alternates: { canonical: "https://conduikt.com/compare/" },
  openGraph: {
    title: "Conduikt vs Competitors — AI Marketing Tool Comparisons",
    description:
      `See how Conduikt's ${AI_AGENT_COUNT} AI marketing agents compare to Jasper, Copy.ai, Writesonic, and Surfer SEO. Full feature breakdowns and honest analysis.`,
    url: "https://conduikt.com/compare/",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
    { "@type": "ListItem", position: 2, name: "Compare", item: "https://conduikt.com/compare/" },
  ],
};

const comparisons = [
  {
    slug: "jasper",
    competitor: "Jasper",
    tagline: "AI marketing that audits before it writes",
    highlights: [
      `${AI_AGENT_COUNT} specialized agents vs. one general-purpose writer`,
      "Built-in multi-channel publishing",
      "Campaign orchestrator for end-to-end automation",
    ],
    conduiktWins: 9,
    totalFeatures: 12,
  },
  {
    slug: "copy-ai",
    competitor: "Copy.ai",
    tagline: "From templates to intelligent marketing automation",
    highlights: [
      "Performance data feeds future content generation",
      "White-label PDF reports for agencies",
      "Purpose-built for marketing teams",
    ],
    conduiktWins: 8,
    totalFeatures: 12,
  },
  {
    slug: "writesonic",
    competitor: "Writesonic",
    tagline: "Beyond AI writing — full marketing automation",
    highlights: [
      "Google Search Console sync for real keyword data",
      "End-to-end workflow: audit → create → publish → analyze",
      "Campaign orchestrator chains agents into pipelines",
    ],
    conduiktWins: 10,
    totalFeatures: 12,
  },
  {
    slug: "surfer-seo",
    competitor: "Surfer SEO",
    tagline: "SEO analysis + AI content in one platform",
    highlights: [
      "Covers the entire marketing stack, not just SEO content",
      "Social posts, emails, and copy — not just blog content",
      "More affordable with a generous free tier",
    ],
    conduiktWins: 10,
    totalFeatures: 12,
  },
];

export default function CompareIndexPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Hero */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-16 md:px-10 md:pt-24">
        <div className="flex max-w-[760px] flex-col gap-4">
          <p className="text-label text-accent">Comparisons</p>
          <h1 className="text-display-m text-text">How Conduikt stacks up</h1>
          <p className="text-lg leading-relaxed text-text-2">
            Honest, feature-by-feature comparisons against the most popular AI
            marketing tools. See exactly where Conduikt wins, and where it
            doesn&apos;t.
          </p>
        </div>
      </section>

      {/* Comparison cards */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-24 md:px-10">
        <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {comparisons.map((c, i) => (
            <li key={c.slug} className="animate-in flex" style={{ animationDelay: `${i * 80}ms` }}>
              <Link
                href={`/compare/${c.slug}`}
                className="group hover-card hover-card-quiet flex w-full flex-col rounded-lg border border-line bg-surface p-6 md:p-7"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-label text-text-3">Conduikt vs</p>
                    <h2 className="text-heading text-text">{c.competitor}</h2>
                  </div>
                  <Badge variant="success" className="shrink-0">
                    {c.conduiktWins}/{c.totalFeatures} wins
                  </Badge>
                </div>

                <p className="mb-6 text-body text-text-2">{c.tagline}</p>

                <ul className="mb-8 flex-1 space-y-2">
                  {c.highlights.map((h, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                      <span className="text-body-s text-text-2">{h}</span>
                    </li>
                  ))}
                </ul>

                <span className="inline-flex items-center gap-1.5 text-body-s font-medium text-accent-hover">
                  See the full comparison
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
            Ready to see for yourself?
          </h2>
          <p className="max-w-[560px] text-lg leading-relaxed text-ink-text-2">
            Start free. No credit card required. 5 pieces of content on us.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
