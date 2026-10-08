import type { Metadata } from "next";
import {
  PricingGrid,
  type PricingTier,
} from "@/src/components/marketing/pricing-card";
import { AI_AGENT_COUNT, aiAgentCountForTier } from "@/src/lib/ai/agents/display";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro $49, Growth $99, Agency $249",
  description:
    `Simple Conduikt pricing. Start free with ${aiAgentCountForTier("free")} AI marketing agents and basic email marketing. Upgrade to Pro for ${aiAgentCountForTier("pro")} agents, a custom sending domain, and 10K marketing emails a month. Growth unlocks all ${AI_AGENT_COUNT}. Agency adds white-label client reports.`,
  alternates: { canonical: "https://conduikt.com/pricing/" },
  openGraph: {
    title: "Pricing — Free, Pro $49, Growth $99, Agency $249",
    description:
      `Simple Conduikt pricing. Start free with ${aiAgentCountForTier("free")} AI marketing agents and basic email marketing. Upgrade to Pro for ${aiAgentCountForTier("pro")} agents, a custom sending domain, and 10K marketing emails a month. Growth unlocks all ${AI_AGENT_COUNT}. Agency adds white-label client reports.`,
    url: "https://conduikt.com/pricing/",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
    { "@type": "ListItem", position: 2, name: "Pricing", item: "https://conduikt.com/pricing/" },
  ],
};

// Full feature lists shown on the dedicated pricing page (no
// "Show all features" toggle since the whole point of /pricing is the
// full breakdown). Tier-specific period suffix passed through; "/forever"
// reads better for Free than "/mo".
const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    features: [
      `${aiAgentCountForTier("free")} AI agents (Site Audit, Social, Keyword Finder)`,
      "5 pieces of content a month",
      "1 project",
      "Email marketing — 1 audience, 100 contacts",
      "50 marketing emails / month (shared sender)",
      "Basic results — critical findings require Pro",
      "Manual copy-paste publishing",
    ],
    cta: "Get started free",
    popular: false,
    ctaHref: "/signup",
  },
  {
    name: "Pro",
    price: "$49",
    period: "/per month",
    features: [
      `${aiAgentCountForTier("pro")} AI agents`,
      "250 pieces of content a month",
      "5 projects",
      "Full unblurred results on every agent",
      "Growth Plan included",
      "Multi-channel publishing (X + LinkedIn)",
      "Email marketing — 3 audiences, 2,000 contacts each",
      "10,000 marketing emails / month",
      "Custom sending domain (better deliverability)",
      "Saved assets library",
      "Email support",
    ],
    cta: "Start Pro trial",
    popular: true,
    ctaHref: "/signup?plan=pro",
  },
  {
    name: "Growth",
    price: "$99",
    period: "/per month",
    features: [
      `All ${AI_AGENT_COUNT} AI agents — Pro plus Campaign, Video Ad, Split Test, Landing Pages, and the Calendar`,
      "500 pieces of content a month",
      "15 projects",
      "Email marketing — 10 audiences, 10,000 contacts each",
      "50,000 marketing emails / month",
      "Analytics dashboard with feedback loop",
      "Priority support (24h response)",
    ],
    cta: "Start Growth trial",
    popular: false,
    ctaHref: "/signup?plan=growth",
  },
  {
    name: "Agency",
    price: "$249",
    period: "/per month",
    features: [
      `All ${AI_AGENT_COUNT} AI agents plus Client Reports (white-label PDFs)`,
      "Unlimited pieces of content",
      "Unlimited projects",
      "Multi-client workspace",
      "Team seats (up to 5 included)",
      "Email marketing — unlimited audiences, 25,000 contacts each",
      "200,000 marketing emails / month",
      "White-label exports (remove Conduikt branding)",
      "API access",
      "Bulk operations across projects",
      "Dedicated support",
    ],
    cta: "Contact sales",
    popular: false,
    ctaHref: "/signup?plan=agency",
  },
];

export default function PricingPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
        <div className="flex max-w-[760px] flex-col gap-4">
          <p className="text-label text-accent">Pricing</p>
          <h1 className="text-display-m text-text">Simple pricing</h1>
          <p className="text-lg leading-relaxed text-text-2">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
          <p className="text-body-s text-text-3">Annual plans coming soon. Save up to 20%.</p>
        </div>
        <PricingGrid tiers={tiers} />
      </section>
    </div>
  );
}
