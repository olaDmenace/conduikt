import Link from "next/link";
import { Metadata } from "next";
import { CheckCircle2, XCircle, ArrowRight } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { AI_AGENT_COUNT } from "@/src/lib/ai/agents/display";

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
      { name: "Site audit", conduikt: true, competitor: false },
      { name: "Conversion check", conduikt: true, competitor: false },
      { name: "Blog posts", conduikt: true, competitor: true },
      { name: "Social posts", conduikt: true, competitor: true },
      { name: "Email sequences", conduikt: true, competitor: true },
      { name: "Posts to multiple channels", conduikt: true, competitor: false },
      { name: "Campaigns across agents", conduikt: true, competitor: false },
      { name: "Learns from what worked", conduikt: true, competitor: false },
      { name: "Keyword Finder", conduikt: true, competitor: false },
      { name: "White-label PDF reports", conduikt: true, competitor: false },
      { name: "Free plan", conduikt: "5 pieces of content", competitor: "7-day trial" },
      { name: "Starting price", conduikt: "$49/mo", competitor: "$49/mo" },
    ],
    whyConduikt: [
      "Conduikt audits your site BEFORE generating content, so every piece is data-driven.",
      `${AI_AGENT_COUNT} specialized AI agents vs. one general-purpose writer.`,
      "Built-in publishing to X and LinkedIn. Email sequences export to your ESP, no separate copywriter needed.",
      "Campaign orchestrator chains agents together for end-to-end automation.",
    ],
  },
  {
    slug: "copy-ai",
    competitor: "Copy.ai",
    tagline: "From templates to intelligent marketing automation",
    features: [
      { name: "Site audit", conduikt: true, competitor: false },
      { name: "Blog posts", conduikt: true, competitor: true },
      { name: "Social posts", conduikt: true, competitor: true },
      { name: "Email sequences", conduikt: true, competitor: true },
      { name: "Copywriting", conduikt: true, competitor: true },
      { name: "Posts to multiple channels", conduikt: true, competitor: false },
      { name: "Campaigns across agents", conduikt: true, competitor: "Workflows" },
      { name: "Learns from what worked", conduikt: true, competitor: false },
      { name: "Growth Plan", conduikt: true, competitor: false },
      { name: "Content calendar", conduikt: true, competitor: false },
      { name: "Free plan", conduikt: "5 pieces of content", competitor: "2,000 words" },
      { name: "Starting price", conduikt: "$49/mo", competitor: "$49/mo" },
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
      { name: "Site audit", conduikt: true, competitor: false },
      { name: "Conversion check", conduikt: true, competitor: false },
      { name: "Blog posts", conduikt: true, competitor: true },
      { name: "Social posts", conduikt: true, competitor: true },
      { name: "Email sequences", conduikt: true, competitor: false },
      { name: "Posts to multiple channels", conduikt: true, competitor: false },
      { name: "Campaigns across agents", conduikt: true, competitor: false },
      { name: "Competitor Watch", conduikt: true, competitor: false },
      { name: "Strategy", conduikt: true, competitor: false },
      { name: "Google Search Console sync", conduikt: true, competitor: false },
      { name: "Free plan", conduikt: "5 pieces of content", competitor: "10,000 words" },
      { name: "Starting price", conduikt: "$49/mo", competitor: "$20/mo" },
    ],
    whyConduikt: [
      `${AI_AGENT_COUNT} specialized AI agents vs. generic writing templates.`,
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
      { name: "Site audit", conduikt: true, competitor: true },
      { name: "Content writing", conduikt: `${AI_AGENT_COUNT} agents`, competitor: "1 editor" },
      { name: "Conversion check", conduikt: true, competitor: false },
      { name: "Social posts", conduikt: true, competitor: false },
      { name: "Email sequences", conduikt: true, competitor: false },
      { name: "Posts to multiple channels", conduikt: true, competitor: false },
      { name: "Campaigns across agents", conduikt: true, competitor: false },
      { name: "Keyword research", conduikt: true, competitor: true },
      { name: "Growth Plan", conduikt: true, competitor: false },
      { name: "Content calendar", conduikt: true, competitor: false },
      { name: "Free plan", conduikt: "5 pieces of content", competitor: false },
      { name: "Starting price", conduikt: "$49/mo", competitor: "$89/mo" },
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
  const description = `Compare Conduikt and ${competitor}. See how Conduikt's ${AI_AGENT_COUNT} AI marketing agents stack up for SEO audits, content generation, and multi-channel publishing.`;
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
      <div className="mx-auto w-full max-w-[1200px] px-4 py-32 md:px-10">
        <h1 className="text-display-s text-text">Comparison not found</h1>
        <p className="mt-4 text-body text-text-2">
          <Link href="/" className="hover-link text-accent-hover hover:text-accent hover:underline">
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
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-12 md:px-10 md:pt-16">
        <div className="flex max-w-[760px] flex-col gap-4">
          <nav aria-label="Breadcrumb" className="text-body-s text-text-3">
            <Link href="/" className="hover-link hover:text-text">
              Home
            </Link>
            <span className="mx-2" aria-hidden>/</span>
            <Link href="/compare" className="hover-link hover:text-text">
              Compare
            </Link>
          </nav>
          <p className="mt-2 text-label text-accent">Comparison</p>
          <h1 className="text-display-m text-text">
            Conduikt vs {comparison.competitor}
          </h1>
          <p className="text-lg leading-relaxed text-text-2">
            {comparison.tagline}
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 md:px-10">
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="p-4 text-left text-label text-text-3">
                  Feature
                </th>
                <th className="w-40 p-4 text-center text-label text-accent">
                  Conduikt
                </th>
                <th className="w-40 p-4 text-center text-label text-text-3">
                  {comparison.competitor}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.features.map((f) => (
                <tr
                  key={f.name}
                  className="border-b border-line last:border-0"
                >
                  <td className="p-4 text-body text-text">
                    {f.name}
                  </td>
                  <td className="p-4 text-center">
                    {typeof f.conduikt === "boolean" ? (
                      f.conduikt ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-teal" aria-label="Yes" />
                      ) : (
                        <XCircle className="mx-auto h-5 w-5 text-text-3" aria-label="No" />
                      )
                    ) : (
                      <span className="font-mono text-body-s text-text">
                        {f.conduikt}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof f.competitor === "boolean" ? (
                      f.competitor ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-teal" aria-label="Yes" />
                      ) : (
                        <XCircle className="mx-auto h-5 w-5 text-text-3" aria-label="No" />
                      )
                    ) : (
                      <span className="font-mono text-body-s text-text-2">
                        {f.competitor}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Why Conduikt */}
      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-14 md:px-10 md:py-[72px]">
          <div className="flex flex-col gap-3">
            <p className="text-label text-ink-accent">Why Conduikt</p>
            <h2 className="text-display-s text-ink-text">
              Why choose Conduikt
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {comparison.whyConduikt.map((reason, i) => (
              <li
                key={i}
                className="animate-in flex items-start gap-3 rounded-lg border border-ink-line bg-ink-surface p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ink-teal" />
                <p className="text-body text-ink-text-2">{reason}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-5 px-4 py-16 md:px-10 md:py-24">
        <h2 className="max-w-[760px] text-display-s text-text">
          Ready to switch to smarter marketing?
        </h2>
        <p className="max-w-[560px] text-lg leading-relaxed text-text-2">
          Start free with 5 pieces of content. No credit card required.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
