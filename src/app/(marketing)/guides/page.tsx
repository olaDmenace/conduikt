import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

export const metadata: Metadata = {
  title: "AI Marketing Guides — Conduikt",
  description:
    "Practical guides to automating your marketing with AI. Learn how to build SEO content strategies, automate social media, and scale email marketing.",
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
      {/* Hero */}
      <section className="pt-8 pb-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge className="mb-6">Guides</Badge>
          <h1 className="text-hero text-text-primary">AI Marketing Guides</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Practical, step-by-step guides to automating your marketing with AI.
            Written for founders and marketers who want results, not theory.
          </p>
        </div>
      </section>

      {/* Guide Cards */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col gap-6">
            {guides.map((g) => (
              <Card
                key={g.slug}
                className="group hover:border-accent/50 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <BookOpen className="h-4 w-4 text-accent" />
                        <div className="flex items-center gap-2 text-caption text-text-tertiary">
                          <Clock className="h-3 w-3" />
                          <span>{g.readTime}</span>
                          <span>·</span>
                          <span>{g.sections} sections</span>
                        </div>
                      </div>
                      <h2 className="text-h2 text-text-primary mb-2 group-hover:text-accent transition-colors">
                        {g.title}
                      </h2>
                      <p className="text-body text-text-secondary mb-4 max-w-2xl">
                        {g.intro}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {g.topics.map((t) => (
                          <span
                            key={t}
                            className="text-caption text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link href={`/guides/${g.slug}`} className="shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full md:w-auto"
                      >
                        Read Guide
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
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
            Stop reading. Start automating.
          </h2>
          <p className="text-body text-text-secondary mb-8">
            Conduikt puts all of these strategies into practice with 10 AI agents.
            Start free — no credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
