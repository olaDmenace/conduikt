import type { Metadata } from "next";
import {
  PricingGrid,
  type PricingTier,
} from "@/src/components/marketing/pricing-card";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro $49, Growth $99, Agency $249",
  description:
    "Simple Conduikt pricing. Start free with 3 AI marketing agents and basic email marketing. Upgrade to Pro for the full 10-agent suite, custom sending domain, and 10K marketing emails/month. Growth for analytics. Agency for white-label client reports.",
  alternates: { canonical: "https://conduikt.com/pricing/" },
  openGraph: {
    title: "Pricing — Free, Pro $49, Growth $99, Agency $249",
    description:
      "Simple Conduikt pricing. Start free with 3 AI marketing agents and basic email marketing. Upgrade to Pro for the full 10-agent suite, custom sending domain, and 10K marketing emails/month. Growth for analytics. Agency for white-label client reports.",
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
      "3 AI agents (SEO Audit, Social, Keywords)",
      "5 generations / month",
      "1 project",
      "Email marketing — 1 audience, 100 contacts",
      "50 marketing emails / month (shared sender)",
      "Basic results — critical findings require Pro",
      "Manual copy-paste publishing",
    ],
    cta: "Get Started Free",
    popular: false,
    ctaHref: "/signup",
  },
  {
    name: "Pro",
    price: "$49",
    period: "/per month",
    features: [
      "10 AI agents — full suite",
      "250 generations / month",
      "5 projects",
      "Full unblurred results on every agent",
      "Growth Playbook included",
      "Multi-channel publishing (X + LinkedIn)",
      "Email marketing — 3 audiences, 2,000 contacts each",
      "10,000 marketing emails / month",
      "Custom sending domain (better deliverability)",
      "Saved assets library",
      "Email support",
    ],
    cta: "Start Pro Trial",
    popular: true,
    ctaHref: "/signup?plan=pro",
  },
  {
    name: "Growth",
    price: "$99",
    period: "/per month",
    features: [
      "14 AI agents — Pro plus Campaigns, Calendar, A/B Tests, Video Ads",
      "500 generations / month",
      "15 projects",
      "Email marketing — 10 audiences, 10,000 contacts each",
      "50,000 marketing emails / month",
      "Analytics dashboard with feedback loop",
      "Priority support (24h response)",
    ],
    cta: "Start Growth Trial",
    popular: false,
    ctaHref: "/signup?plan=growth",
  },
  {
    name: "Agency",
    price: "$249",
    period: "/per month",
    features: [
      "15 AI agents — exclusive Client Reports (white-label PDFs)",
      "Unlimited generations",
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
    cta: "Contact Sales",
    popular: false,
    ctaHref: "/signup?plan=agency",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-6 sm:pt-8 pb-14 sm:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h1 className="text-hero text-text-primary">Simple pricing</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
          <p className="mt-2 text-small text-text-tertiary">Annual plans coming soon &mdash; save up to 20%.</p>
        </div>
        <PricingGrid tiers={tiers} />
      </div>
    </div>
  );
}
