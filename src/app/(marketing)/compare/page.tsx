import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

export const metadata: Metadata = {
  title: "Conduikt vs Competitors — AI Marketing Tool Comparisons",
  description:
    "See how Conduikt's 15 AI marketing agents compare to Jasper, Copy.ai, Writesonic, and Surfer SEO. Full feature breakdowns and honest analysis.",
  alternates: { canonical: "https://conduikt.com/compare/" },
  openGraph: {
    title: "Conduikt vs Competitors — AI Marketing Tool Comparisons",
    description:
      "See how Conduikt's 15 AI marketing agents compare to Jasper, Copy.ai, Writesonic, and Surfer SEO. Full feature breakdowns and honest analysis.",
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
      "10 specialized agents vs. one general-purpose writer",
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
      <section className="pt-8 pb-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge className="mb-6">Comparisons</Badge>
          <h1 className="text-hero text-text-primary">
            How Conduikt Stacks Up
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Honest, feature-by-feature comparisons against the most popular AI
            marketing tools. See exactly where Conduikt wins — and where it
            doesn&apos;t.
          </p>
        </div>
      </section>

      {/* Comparison Cards */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparisons.map((c) => (
              <Card
                key={c.slug}
                className="group hover:border-accent/50 transition-colors"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-caption text-text-tertiary mb-1">
                        Conduikt vs
                      </p>
                      <h2 className="text-h2 text-text-primary">{c.competitor}</h2>
                    </div>
                    <Badge variant="secondary" className="shrink-0 ml-4">
                      {c.conduiktWins}/{c.totalFeatures} wins
                    </Badge>
                  </div>

                  <p className="text-body text-text-secondary mb-6">{c.tagline}</p>

                  <ul className="space-y-2 mb-8 flex-1">
                    {c.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span className="text-small text-text-secondary">{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={`/compare/${c.slug}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full group-hover:border-accent/50"
                    >
                      See Full Comparison
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-h1 text-text-primary mb-4">
            Ready to see for yourself?
          </h2>
          <p className="text-body text-text-secondary mb-8">
            Start free. No credit card required. 5 AI generations on us.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Start Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
