import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
    title: "Multi-Channel Publishing for LinkedIn, X, and Email",
    href: "/features#publishing",
    description:
      "Publish directly to X, LinkedIn, and email platforms. One dashboard for all your marketing channels.",
  },
  {
    icon: TrendingUp,
    title: "Marketing Analytics That Improve Over Time",
    href: "/features#analytics",
    description:
      "Performance data feeds back into AI to improve future generations. Your marketing gets smarter over time.",
  },
  {
    icon: Mail,
    title: "AI Email Sequence Builder for SaaS",
    href: "/features#email",
    description:
      "Create automated welcome, nurture, and launch email flows. AI writes the copy, you set the triggers.",
  },
  {
    icon: Shield,
    title: "Automated Marketing Campaign Builder",
    href: "/features#campaigns",
    description:
      "Chain audits, strategy, content, and publishing into automated campaigns. Set it up once, let it run.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "See what Conduikt can do",
    features: [
      "3 AI agents (SEO Audit, Social, Keywords)",
      "5 generations/month",
      "1 project",
      "Basic results (critical findings require Pro)",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    description: "Everything you need to market your business",
    features: [
      "10 AI agents — full suite",
      "250 generations/month",
      "5 projects",
      "Full unblurred results on all agents",
      "Growth Playbook included",
      "Multi-channel publishing",
      "Saved assets library",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Growth",
    price: "$99",
    description: "Execute and optimize at scale",
    features: [
      "14 AI agents — Pro plus Campaigns, Calendar, A/B Tests, Video Ads",
      "500 generations/month",
      "15 projects",
      "Analytics feedback loop",
      "Priority support (24h response)",
    ],
    cta: "Start Growth Trial",
    popular: false,
  },
  {
    name: "Agency",
    price: "$249",
    description: "Manage multiple clients from one account",
    features: [
      "15 AI agents — Growth plus exclusive Client Reports (white-label PDFs)",
      "Unlimited generations",
      "Unlimited projects",
      "Multi-client workspace",
      "Team seats (up to 5)",
      "White-label exports + API access",
      "Dedicated support",
    ],
    cta: "Contact Agency Sales",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
                    Start Free AI Marketing Audit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/features">See How It Works</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-small text-text-tertiary">
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

            {/* Dashboard Preview */}
            <div className="animate-in relative" style={{ animationDelay: "120ms" }}>
              <Image
                src="/images/conduikt-dashboard.png"
                alt="Conduikt AI marketing dashboard showing SEO score 87, CRO score 92, and 24 generated marketing assets"
                width={600}
                height={450}
                priority
                sizes="(max-width: 1024px) 100vw, 600px"
                className="rounded-xl border border-border-default shadow-[var(--shadow-elevated)] transform rotate-1 hover:rotate-0 transition-transform duration-500 w-full h-auto"
              />
              <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
              <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-accent-secondary/10 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Channel Badges */}
      <section className="py-12 border-y border-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-caption text-text-tertiary mb-6">
            Publish everywhere from one dashboard
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              { icon: Twitter, name: "X / Twitter" },
              { icon: Linkedin, name: "LinkedIn" },
              { icon: Mail, name: "Email" },
              { icon: Globe, name: "Your Website" },
            ].map((channel) => (
              <div key={channel.name} className="flex items-center gap-2 text-text-secondary">
                <channel.icon className="h-5 w-5" />
                <span className="text-small font-medium">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-text-primary">
              AI SEO Audits, Content Generation, and Multi-Channel Publishing &mdash; All in One Place
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              From SEO audits to social publishing, Conduikt handles the entire
              marketing workflow so you can focus on building.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card key={feature.title} hover className="animate-in" style={{ animationDelay: `${i * 60}ms` }}>
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
          <div className="mt-10 text-center">
            <Link
              href="/compare"
              className="text-small text-text-tertiary hover:text-accent transition-colors underline underline-offset-4"
            >
              See how Conduikt compares to Jasper, Copy.ai, and other AI marketing tools
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="py-20 border-t border-border-subtle"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-h1 text-text-primary">
              Founders and Marketers Are Already Building With Conduikt
            </h2>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              Real feedback from real users. Hover or click a card to pause.
            </p>
          </div>
        </div>
        <TestimonialMarquee testimonials={testimonials} />
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-text-primary">Simple Pricing That Scales With Your Business</h2>
            <p className="mt-4 text-lg text-text-secondary">Start free. Scale as you grow.</p>
            <p className="mt-2 text-small text-text-tertiary">Annual plans coming soon &mdash; save up to 20%.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <Card
                key={tier.name}
                className={`animate-in relative ${tier.popular ? "border-accent shadow-[0_0_30px_var(--accent-glow)]" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <h3 className="text-h3 text-text-primary">{tier.name}</h3>
                  <p className="text-small text-text-secondary mt-1">{tier.description}</p>
                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-bold font-mono text-text-primary">{tier.price}</span>
                    <span className="text-text-tertiary text-small">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-small text-text-secondary">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant={tier.popular ? "primary" : "secondary"} className="w-full" asChild>
                    <Link href="/signup">{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 border-t border-border-subtle">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-text-primary">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-text-secondary">
              Everything you need to know about Conduikt.
            </p>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="animate-in rounded-xl border border-border-default bg-surface-1 p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <h3 className="text-h3 text-text-primary">{faq.question}</h3>
                <p className="mt-2 text-body text-text-secondary">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-h1 text-text-primary">Ready to automate your marketing?</h2>
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
