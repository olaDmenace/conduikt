import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

interface GuideSection {
  heading: string;
  content: string;
}

interface Guide {
  slug: string;
  title: string;
  intro: string;
  agentCta: { label: string; href: string };
  sections: GuideSection[];
}

const GUIDES: Guide[] = [
  {
    slug: "social-media-marketing",
    title: "How to Automate Social Media Marketing with AI",
    intro:
      "Social media marketing is time-consuming. Between creating content, scheduling posts, and analyzing performance, it can eat up 10+ hours per week. AI automation changes that equation entirely.",
    agentCta: { label: "Try the Social Agent", href: "/signup" },
    sections: [
      {
        heading: "Why Automate Social Media?",
        content:
          "Manual social media management doesn't scale. You're competing with brands that post 3-5x per week across multiple platforms. AI lets solo founders and small teams match enterprise-level output without enterprise-level budgets. The key is not just generating content, but generating the RIGHT content for each platform.",
      },
      {
        heading: "Step 1: Audit Your Current Presence",
        content:
          "Before automating anything, understand where you stand. Run an SEO audit on your website to identify your strongest messaging and keywords. These become the foundation for all social content. Tools like Conduikt's SEO Audit Agent analyze your site and surface the insights that matter for content creation.",
      },
      {
        heading: "Step 2: Create Platform-Specific Content",
        content:
          "The biggest mistake in social automation is cross-posting identical content. X rewards short, punchy hooks under 280 characters. LinkedIn favors 400-700 character professional insights. AI agents can generate platform-optimized content that respects each platform's culture and algorithm. Configure your brand voice once, and every post matches your tone.",
      },
      {
        heading: "Step 3: Build a Content Calendar",
        content:
          "Consistency beats virality. Set up a content calendar with a mix of content types: educational, storytelling, data-driven, behind-the-scenes, and social proof. Rotate through these angles to keep your feed diverse. Schedule posts at optimal times for your audience's timezone.",
      },
      {
        heading: "Step 4: Use Performance Data to Improve",
        content:
          "The real power of AI automation is the feedback loop. Track which posts perform best, what topics resonate, and which platforms drive the most engagement. Feed this data back into your AI content generator so future posts are informed by past performance. This is how AI marketing gets smarter over time.",
      },
      {
        heading: "Step 5: Scale with Campaign Orchestration",
        content:
          "Once individual posts are working, chain them into campaigns. Use a campaign orchestrator to run multi-step sequences: research keywords, generate a blog post, extract social snippets, create email promotion, and schedule everything. What used to take a team of 5 now runs on autopilot.",
      },
    ],
  },
  {
    slug: "seo-content-strategy",
    title: "How to Build an AI-Powered SEO Content Strategy",
    intro:
      "SEO content strategy used to require expensive consultants and months of planning. AI agents can now audit your site, research keywords, analyze competitors, and generate a full content strategy in minutes.",
    agentCta: { label: "Try the Strategy Agent", href: "/signup" },
    sections: [
      {
        heading: "Start with a Technical Audit",
        content:
          "Every content strategy should begin with understanding your current SEO health. A technical audit identifies missing meta tags, slow pages, broken links, and content gaps. These findings directly inform what content to create and what pages to optimize first.",
      },
      {
        heading: "Research Keywords with AI",
        content:
          "AI keyword research goes beyond volume and difficulty. It clusters keywords by intent, identifies question-based queries for featured snippets, and finds gaps your competitors aren't covering. The best strategies target a mix of high-volume head terms and specific long-tail queries.",
      },
      {
        heading: "Analyze Your Competitors",
        content:
          "Understanding what your competitors rank for — and what they're missing — reveals your biggest opportunities. AI competitor analysis can scan positioning, content strategy, backlink profiles, and messaging to find gaps you can exploit.",
      },
      {
        heading: "Create Content Pillars",
        content:
          "Organize your strategy around 3-5 content pillars: core topics that align with your product and audience needs. Each pillar gets a pillar page (comprehensive guide) supported by cluster content (focused blog posts) that link back. This hub-and-spoke model signals topical authority to search engines.",
      },
      {
        heading: "Generate and Optimize Content",
        content:
          "Use AI blog generation to produce SEO-optimized posts with proper heading hierarchy, meta tags, and keyword placement. The key is maintaining your brand voice while following SEO best practices. AI agents that understand your brand context produce content that reads naturally and ranks well.",
      },
      {
        heading: "Measure, Learn, and Iterate",
        content:
          "Connect Google Search Console to track real rankings and clicks. Feed this performance data back into your AI content generator so it can learn what works. The best SEO strategies are living systems that improve with every piece of content published.",
      },
    ],
  },
  {
    slug: "email-marketing-automation",
    title: "How to Automate Email Marketing with AI Agents",
    intro:
      "Email marketing remains the highest-ROI channel for most businesses. AI automation lets you create personalized, high-converting email sequences without a dedicated email marketer.",
    agentCta: { label: "Try the Email Agent", href: "/signup" },
    sections: [
      {
        heading: "Why AI Email Automation?",
        content:
          "Writing effective email sequences is hard. Subject lines need to be compelling, body copy needs to be scannable, and CTAs need to drive action. AI agents trained on email marketing best practices can generate entire sequences — from welcome flows to launch campaigns — in minutes instead of hours.",
      },
      {
        heading: "Design Your Email Flows",
        content:
          "Start with the three essential sequences: welcome (new subscribers), nurture (building trust), and re-engagement (inactive users). Each sequence should have a clear trigger, 3-7 emails, and a specific goal. AI can generate all the copy while you focus on strategy.",
      },
      {
        heading: "Write Subject Lines That Get Opened",
        content:
          "AI excels at generating subject line variants. Use specificity over cleverness, create curiosity gaps, and test different approaches. Generate 5-10 variants for each email and A/B test the top performers. Data shows that personalized, benefit-driven subject lines consistently outperform generic ones.",
      },
      {
        heading: "Personalize at Scale",
        content:
          "AI-generated emails can be customized based on user segments, behavior, and preferences. Use your product's data to create targeted messaging for different audience personas. The same AI agent can generate different tones and angles for different segments of your list.",
      },
      {
        heading: "Connect to Your Marketing Stack",
        content:
          "Integrate your AI-generated email content with your ESP (Resend, Mailchimp, ConvertKit, etc.) for automated delivery. Set up triggers based on user actions, and let the system run. Review performance weekly and regenerate underperforming emails with updated context.",
      },
      {
        heading: "Optimize with Performance Data",
        content:
          "Track open rates, click rates, and conversion rates for each email in your sequence. Feed winning patterns back into your AI email agent so it generates better content over time. This feedback loop is what separates basic automation from intelligent marketing.",
      },
    ],
  },
];

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  return {
    title: guide?.title || "Marketing Guide",
    description: guide?.intro?.slice(0, 160) || "AI marketing automation guide by Conduikt",
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <div className="py-32 text-center">
        <h1 className="text-h1 text-text-primary">Guide not found</h1>
        <p className="mt-4 text-text-secondary">
          <Link href="/" className="text-accent hover:underline">
            Go back home
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="pt-8 pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex items-center gap-2 mb-6">
            <Badge>
              <BookOpen className="h-3 w-3 mr-1" />
              Guide
            </Badge>
          </div>
          <h1 className="text-hero text-text-primary leading-tight">
            {guide.title}
          </h1>
          <p className="mt-6 text-lg text-text-secondary leading-relaxed">
            {guide.intro}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          {guide.sections.map((section, i) => (
            <Card
              key={i}
              className="animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent>
                <h2 className="text-h2 text-text-primary mb-3">
                  {section.heading}
                </h2>
                <p className="text-body text-text-secondary leading-relaxed">
                  {section.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Agent CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <Card className="border-accent shadow-[0_0_30px_var(--accent-glow)]">
            <CardContent className="text-center py-10">
              <h2 className="text-h1 text-text-primary mb-2">
                Ready to automate?
              </h2>
              <p className="text-lg text-text-secondary mb-6">
                Conduikt&apos;s AI agents handle the entire workflow — audit,
                create, publish, and optimize.
              </p>
              <Button size="lg" asChild>
                <Link href={guide.agentCta.href}>
                  {guide.agentCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Related Guides */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <h3 className="text-h2 text-text-primary mb-4">More Guides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GUIDES.filter((g) => g.slug !== slug)
              .slice(0, 2)
              .map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`}>
                  <Card hover className="h-full">
                    <CardContent>
                      <h4 className="text-h3 text-text-primary mb-2">
                        {g.title}
                      </h4>
                      <p className="text-small text-text-secondary line-clamp-2">
                        {g.intro}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
