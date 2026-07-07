import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Sparkles,
  TrendingUp,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { homepageFaqs as faqs } from "@/src/lib/seo/homepage-schema";
import { TestimonialMarquee } from "@/src/components/marketing/testimonial-marquee";
import { RevealOnScroll } from "@/src/components/marketing/reveal-on-scroll";
import { PricingGrid } from "@/src/components/marketing/pricing-card";
import { FaqAccordion } from "@/src/components/marketing/faq-accordion";
import { HeroVideo } from "@/src/components/marketing/hero-video";

const testimonials = [
  {
    name: "Dara Sobayo",
    quote:
      "Thank you for granting me access to the tool. It provided valuable suggestions for improving the landing page copy.",
  },
  {
    name: "Oluwatobiloba Olajide",
    quote:
      "The Conduikt platform has simplified my work as a brand strategist, making it even more than 10 times easier. Its website audit and SEO strategy makes marketing a lot simpler. Now I can do my keyword research, create social media posts and emails, and generate an AI growth strategy all in the same place.",
  },
  {
    name: "Adeola Owoade",
    quote:
      "Conduikt is a well thought out solution for problems most business owners encounter. It is clearly structured, gives accurate analysis and spot-on suggestions for improved performance. Linking socials is my favorite part, that's the area I struggled with. Kudos really.",
  },
  {
    name: "Olatunbosun Olalekan",
    quote:
      "I used Conduikt and found it to be a clear, reliable, and insightful AI-powered website performance tool. It delivers a well-structured analysis of key metrics such as performance, SEO, and Core Web Vitals, with a useful distinction between mobile and desktop results. The actionable recommendations make it a practical resource for improving website performance and user experience.",
  },
];

const features = [
  {
    icon: BarChart3,
    title: "AI-Powered SEO Audits",
    href: "/features#seo-audit",
    description:
      "Get a comprehensive technical and on-page SEO analysis with specific, actionable fixes — not generic best practices.",
  },
  {
    icon: Sparkles,
    title: "AI Content Generator for Social and Email",
    href: "/features#content",
    description:
      "Generate conversion-focused copy, social posts, and email sequences that actually sound like your brand.",
  },
  {
    icon: Globe,
    title: "Multi-Channel Publishing — Social and Email",
    href: "/features#publishing",
    description:
      "Schedule X and LinkedIn posts, send email broadcasts to your audience, and track delivery — all from one dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Closed-Loop Marketing Analytics",
    href: "/features#analytics",
    description:
      "Engagement data from every post automatically feeds back into the AI's context. The loop tightens with every week of publishing — no manual prompt-tuning required.",
  },
  {
    icon: Mail,
    title: "AI Email Marketing for SaaS",
    href: "/features#email",
    description:
      "Generate welcome, nurture, and launch email sequences with AI, then send them to your audience without leaving Conduikt. Track opens, clicks, and unsubscribes in one place.",
  },
  {
    icon: Shield,
    title: "Automated Marketing Campaign Builder",
    href: "/features#campaigns",
    description:
      "Chain audits, strategy, content, and publishing into automated campaigns. Set it up once, let it run.",
  },
];

// Pricing tiers — `features` are the headline bullets shown by default
// (3-4 per tier per the reference layout). `extraFeatures` are the rest,
// hidden behind a "Show all features" toggle so users who want the full
// breakdown can expand a card without leaving the page.
const tiers = [
  {
    name: "Free",
    price: "$0",
    features: ["3 AI agents", "5 generations/month", "1 project"],
    extraFeatures: [
      "1 audience, 50 marketing emails/mo",
      "Basic results (critical findings require Pro)",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    features: [
      "10 AI agents",
      "250 generations/month",
      "5 projects",
      "Multi-channel publishing",
    ],
    extraFeatures: [
      "Full unblurred results on all agents",
      "Growth Playbook included",
      "3 audiences, 10K emails/mo + custom domain",
      "Saved assets library",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Growth",
    price: "$99",
    features: ["14 AI agents", "500 generations/month", "15 projects"],
    extraFeatures: [
      "Pro plus Campaigns, Calendar, A/B Tests, Video Ads",
      "10 audiences, 50K emails/mo",
      "Analytics feedback loop",
      "Priority support (24h response)",
    ],
    cta: "Start Growth Trial",
    popular: false,
  },
  {
    name: "Agency",
    price: "$249",
    features: [
      "15 AI agents",
      "Unlimited generations",
      "White-label exports",
    ],
    extraFeatures: [
      "Growth plus exclusive Client Reports (white-label PDFs)",
      "Unlimited projects",
      "Multi-client workspace",
      "Team seats (up to 5)",
      "Unlimited audiences, 200K emails/mo",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero Section — sized so it fits within 100vh on 1024×768 per
          DESIGN_SYSTEM.md. Min-height pulls the hero up to (almost)
          full viewport on roomier screens; max-height caps it at 920px
          on huge displays so the next section is always partly visible.
          The 72px subtraction accounts for the sticky nav. */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{
          minHeight: "calc(100vh - 72px)",
          maxHeight: "920px",
          paddingTop: "clamp(48px, 6vw, 80px)",
          paddingBottom: "clamp(48px, 6vw, 80px)",
        }}
      >
        {/* Diagonal pinstripe across the full hero background. Sits at
            a low opacity so the drifting glow orbs above can still
            colour the headline column without the stripes feeling busy. */}
        <div
          aria-hidden="true"
          className="pinstripe-faint pointer-events-none absolute inset-0 opacity-80"
        />
        {/* Five radial accent orbs drift slowly out-of-phase to give
            the hero quiet ambient life. Mix of brand orange (primary)
            and teal (secondary) at different sizes and opacities; each
            uses a different keyframe with offset delays so they never
            line up the same way twice. */}
        <div
          aria-hidden="true"
          className="radial-accent-glow orb-drift-a pointer-events-none absolute -top-32 -left-24 h-[600px] w-[600px] rounded-full opacity-90"
        />
        <div
          aria-hidden="true"
          className="radial-secondary-glow orb-drift-b pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full"
        />
        <div
          aria-hidden="true"
          className="radial-accent-glow orb-drift-c pointer-events-none absolute top-1/3 right-1/4 h-[340px] w-[340px] rounded-full"
        />
        <div
          aria-hidden="true"
          className="radial-secondary-glow orb-drift-d pointer-events-none absolute -top-12 right-1/3 h-[280px] w-[280px] rounded-full"
        />
        <div
          aria-hidden="true"
          className="radial-accent-glow orb-drift-e pointer-events-none absolute bottom-1/4 left-1/3 h-[260px] w-[260px] rounded-full opacity-70"
        />
        <div className="relative mx-auto max-w-7xl px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 items-center">
            <div className="animate-in">
              <Badge className="mb-6">Now in Beta</Badge>
              <h1 className="text-hero text-text-primary leading-[1.1]">AI Marketing Automation for <span className="text-accent">SaaS Founders</span></h1>
              <p className="mt-6 text-lg leading-relaxed text-text-secondary max-w-lg">
                Built for SaaS founders, solo-preneurs, and small business owners
                who need to market smarter without a full team. Connect your
                site and get AI that audits, generates, and publishes across
                every channel automatically.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  5 free AI generations
                </span>
              </div>
              <div className="mt-6">
                <a
                  href="https://www.producthunt.com/products/conduikt?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-conduikt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
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

            {/* Click-to-play product demo. Preview image + play button until
                the user clicks; iframe (Loom) loads on demand. The preview
                image doubles as the fallback if the iframe ever fails. */}
            <HeroVideo />
          </div>
        </div>
      </section>

      {/* Channel Badges — hairline-bordered pills per DESIGN_SYSTEM.md.
          Hover lifts the pill 2px and tints the icon to the brand
          accent. No marquee — these are static so users can read them. */}
      <section className="py-12 border-y border-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-caption text-text-tertiary mb-6">
            Publish everywhere from one dashboard
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { icon: Twitter, name: "X / Twitter" },
              { icon: Linkedin, name: "LinkedIn" },
              { icon: Mail, name: "Email" },
              { icon: Globe, name: "Your Website" },
            ].map((channel) => (
              <div
                key={channel.name}
                className="group flex items-center gap-2 rounded-full border border-border-default bg-surface-1 px-4 py-2 text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2"
              >
                <channel.icon className="h-4 w-4 transition-colors group-hover:text-accent" />
                <span className="text-small font-medium">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <RevealOnScroll as="h2" className="text-h1 text-text-primary">
              AI SEO Audits, Content Generation, and Multi-Channel Publishing &mdash; All in One Place
            </RevealOnScroll>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              From SEO audits to social publishing, Conduikt handles the entire
              marketing workflow so you can focus on building.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card
                key={feature.title}
                hover
                className="animate-in transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent>
                  <div className="mb-4 rounded-lg bg-accent-muted p-3 w-fit">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-h3 text-text-primary">
                    <Link href={feature.href} className="hover:text-accent transition-colors">
                      {feature.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-body text-text-secondary">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/compare"
              className="group inline-flex items-center gap-1.5 text-small font-medium text-accent"
            >
              <span className="relative">
                See how Conduikt compares to Jasper, Copy.ai, and other AI
                marketing tools
                {/* Animated underline — grows from 0 to full width on hover. */}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials — full-width band with diagonal pinstripe behind
          the section per DESIGN_SYSTEM.md. The pinstripe sits at 6%
          opacity so it textures the surface without competing with the
          marquee cards. */}
      <section
        id="testimonials"
        className="relative py-14 sm:py-20 border-t border-border-subtle overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pinstripe absolute inset-0 opacity-60 pointer-events-none"
        />
        <div className="relative">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <RevealOnScroll as="h2" className="text-h1 text-text-primary">
                Founders and Marketers Are Already Building With Conduikt
              </RevealOnScroll>
              <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                Real feedback from real users. Hover or click a card to pause.
              </p>
            </div>
          </div>
          <TestimonialMarquee testimonials={testimonials} />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-14 sm:py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <RevealOnScroll as="h2" className="text-h1 text-text-primary">
              Simple Pricing That Scales With Your Business
            </RevealOnScroll>
            <p className="mt-4 text-lg text-text-secondary">Start free. Scale as you grow.</p>
            <p className="mt-2 text-small text-text-tertiary">Annual plans coming soon &mdash; save up to 20%.</p>
          </div>
          <PricingGrid tiers={tiers} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 sm:py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-16">
            <RevealOnScroll as="h2" className="text-h1 text-text-primary">
              Frequently Asked Questions
            </RevealOnScroll>
            <p className="mt-4 text-lg text-text-secondary">
              Everything you need to know about Conduikt.
            </p>
          </div>
          {/* Hairline-divided rows with a smooth height transition on
              open. Driven by max-height interpolation (native <details>
              can't animate height reliably). + glyph rotates 45° to ×. */}
          <FaqAccordion items={faqs} />
        </div>
      </section>

      {/* Final CTA strip — pinstripe band at 8% opacity with a centered
          radial accent glow per DESIGN_SYSTEM.md. The pinstripe gives
          the section weight without making it heavy; the radial glow
          pulls focus to the headline + CTA. */}
      <section className="relative py-14 sm:py-20 overflow-hidden border-t border-border-subtle">
        <div
          aria-hidden="true"
          className="pinstripe absolute inset-0 opacity-80 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="radial-accent-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full pointer-events-none"
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <RevealOnScroll as="h2" className="text-h1 text-text-primary">
            Ready to automate your marketing?
          </RevealOnScroll>
          <p className="mt-4 text-lg text-text-secondary">
            Join founders and marketers who are using AI to 10x their output.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/signup">
                Try Conduikt Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

    </>
  );
}
