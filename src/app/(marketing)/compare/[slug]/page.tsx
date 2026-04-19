import Link from "next/link";
import { Metadata } from "next";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

interface Comparison {
  slug: string;
  competitor: string;
  tagline: string;
  features: Array<{
    name: string;
    conduikt: boolean | string;
    competitor: boolean | string;
  }>;
  whyConduikt: string[];
}

const COMPARISONS: Comparison[] = [
  {
    slug: "jasper",
    competitor: "Jasper",
    tagline: "AI marketing that audits before it writes",
    features: [
      { name: "SEO Audit Agent", conduikt: true, competitor: false },
      { name: "CRO Analysis", conduikt: true, competitor: false },
      { name: "Blog Post Generation", conduikt: true, competitor: true },
      { name: "Social Content", conduikt: true, competitor: true },
      { name: "Email Sequences", conduikt: true, competitor: true },
      { name: "Multi-Channel Publishing", conduikt: true, competitor: false },
      { name: "Campaign Orchestrator", conduikt: true, competitor: false },
      { name: "Performance Feedback Loop", conduikt: true, competitor: false },
      { name: "Keyword Research Agent", conduikt: true, competitor: false },
      { name: "White-Label PDF Reports", conduikt: true, competitor: false },
      { name: "Free Tier", conduikt: "5 generations", competitor: "7-day trial" },
      { name: "Starting Price", conduikt: "$49/mo", competitor: "$49/mo" },
    ],
    whyConduikt: [
      "Conduikt audits your site BEFORE generating content, so every piece is data-driven.",
      "10 specialized AI agents vs. one general-purpose writer.",
      "Built-in publishing to X and LinkedIn. Email sequences export to your ESP, no separate copywriter needed.",
      "Campaign orchestrator chains agents together for end-to-end automation.",
    ],
  },
  {
    slug: "copy-ai",
    competitor: "Copy.ai",
    tagline: "From templates to intelligent marketing automation",
    features: [
      { name: "SEO Audit Agent", conduikt: true, competitor: false },
      { name: "Blog Post Generation", conduikt: true, competitor: true },
      { name: "Social Content", conduikt: true, competitor: true },
      { name: "Email Sequences", conduikt: true, competitor: true },
      { name: "Copywriting", conduikt: true, competitor: true },
      { name: "Multi-Channel Publishing", conduikt: true, competitor: false },
      { name: "Campaign Orchestrator", conduikt: true, competitor: "Workflows" },
      { name: "Performance Feedback Loop", conduikt: true, competitor: false },
      { name: "Growth Playbook Agent", conduikt: true, competitor: false },
      { name: "Content Calendar", conduikt: true, competitor: false },
      { name: "Free Tier", conduikt: "5 generations", competitor: "2,000 words" },
      { name: "Starting Price", conduikt: "$49/mo", competitor: "$49/mo" },
    ],
    whyConduikt: [
      "Conduikt doesn't just write — it audits, strategizes, and publishes.",
      "Performance data feeds back into future generations, so content improves over time.",
      "Purpose-built for marketing teams, not generic content creation.",
      "White-label PDF reports for client-facing agencies.",
    ],
  },
  {
    slug: "writesonic",
    competitor: "Writesonic",
    tagline: "Beyond AI writing — full marketing automation",
    features: [
      { name: "SEO Audit Agent", conduikt: true, competitor: false },
      { name: "CRO Analysis", conduikt: true, competitor: false },
      { name: "Blog Post Generation", conduikt: true, competitor: true },
      { name: "Social Content", conduikt: true, competitor: true },
      { name: "Email Sequences", conduikt: true, competitor: false },
      { name: "Multi-Channel Publishing", conduikt: true, competitor: false },
      { name: "Campaign Orchestrator", conduikt: true, competitor: false },
      { name: "Competitor Analysis Agent", conduikt: true, competitor: false },
      { name: "Content Strategy Agent", conduikt: true, competitor: false },
      { name: "Google Search Console Sync", conduikt: true, competitor: false },
      { name: "Free Tier", conduikt: "5 generations", competitor: "10,000 words" },
      { name: "Starting Price", conduikt: "$49/mo", competitor: "$20/mo" },
    ],
    whyConduikt: [
      "10 specialized AI agents vs. generic writing templates.",
      "End-to-end workflow: audit → strategize → create → publish → analyze.",
      "Google Search Console integration for real keyword data.",
      "Campaign orchestrator chains agents into automated pipelines.",
    ],
  },
  {
    slug: "surfer-seo",
    competitor: "Surfer SEO",
    tagline: "SEO analysis + AI content in one platform",
    features: [
      { name: "SEO Audit", conduikt: true, competitor: true },
      { name: "Content Generation", conduikt: "10 agents", competitor: "1 editor" },
      { name: "CRO Analysis", conduikt: true, competitor: false },
      { name: "Social Content", conduikt: true, competitor: false },
      { name: "Email Sequences", conduikt: true, competitor: false },
      { name: "Multi-Channel Publishing", conduikt: true, competitor: false },
      { name: "Campaign Orchestrator", conduikt: true, competitor: false },
      { name: "Keyword Research", conduikt: true, competitor: true },
      { name: "Growth Playbook", conduikt: true, competitor: false },
      { name: "Content Calendar", conduikt: true, competitor: false },
      { name: "Free Tier", conduikt: "5 generations", competitor: false },
      { name: "Starting Price", conduikt: "$49/mo", competitor: "$89/mo" },
    ],
    whyConduikt: [
      "Surfer focuses on SEO content optimization. Conduikt covers the entire marketing stack.",
      "Create social posts, emails, and copy — not just blog content.",
      "Campaign orchestrator automates multi-step marketing workflows.",
      "More affordable starting price with a generous free tier.",
    ],
  },
];

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comparison = COMPARISONS.find((c) => c.slug === slug);
  const competitor = comparison?.competitor || slug;
  const url = `https://conduikt.com/compare/${slug}/`;
  const title = `Conduikt vs ${competitor} — AI Marketing Comparison`;
  const description = `Compare Conduikt and ${competitor}. See how Conduikt's 10 AI marketing agents stack up for SEO audits, content generation, and multi-channel publishing.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = COMPARISONS.find((c) => c.slug === slug);

  if (!comparison) {
    return (
      <div className="py-32 text-center">
        <h1 className="text-h1 text-text-primary">Comparison not found</h1>
        <p className="mt-4 text-text-secondary">
          <Link href="/" className="text-accent hover:underline">
            Go back home
          </Link>
        </p>
      </div>
    );
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
      { "@type": "ListItem", position: 2, name: "Compare", item: "https://conduikt.com/compare/" },
      {
        "@type": "ListItem",
        position: 3,
        name: `Conduikt vs ${comparison.competitor}`,
        item: `https://conduikt.com/compare/${comparison.slug}/`,
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Hero */}
      <section className="pt-8 pb-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge className="mb-6">Comparison</Badge>
          <h1 className="text-hero text-text-primary">
            Conduikt vs {comparison.competitor}
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            {comparison.tagline}
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left text-caption text-text-tertiary p-4">
                      Feature
                    </th>
                    <th className="text-center text-caption text-accent p-4 w-40">
                      Conduikt
                    </th>
                    <th className="text-center text-caption text-text-secondary p-4 w-40">
                      {comparison.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.features.map((f) => (
                    <tr
                      key={f.name}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <td className="text-body text-text-primary p-4">
                        {f.name}
                      </td>
                      <td className="text-center p-4">
                        {typeof f.conduikt === "boolean" ? (
                          f.conduikt ? (
                            <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-text-tertiary mx-auto" />
                          )
                        ) : (
                          <span className="text-small text-accent">
                            {f.conduikt}
                          </span>
                        )}
                      </td>
                      <td className="text-center p-4">
                        {typeof f.competitor === "boolean" ? (
                          f.competitor ? (
                            <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-text-tertiary mx-auto" />
                          )
                        ) : (
                          <span className="text-small text-text-secondary">
                            {f.competitor}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Conduikt */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-h1 text-text-primary text-center mb-8">
            Why Choose Conduikt
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparison.whyConduikt.map((reason, i) => (
              <Card
                key={i}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <p className="text-body text-text-secondary">{reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-h1 text-text-primary">
            Ready to switch to smarter marketing?
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Start free with 5 AI generations. No credit card required.
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
    </div>
  );
}
