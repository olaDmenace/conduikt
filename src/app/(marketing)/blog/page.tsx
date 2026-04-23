import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { BLOG_POSTS } from "@/src/content/blog/posts";

export const metadata: Metadata = {
  title: "Blog — AI Marketing for SaaS Founders",
  description:
    "Playbooks, teardowns, and field reports on running lean SaaS marketing with AI agents. Written for founders who ship.",
  alternates: { canonical: "https://conduikt.com/blog/" },
  openGraph: {
    title: "Conduikt Blog — AI Marketing for SaaS Founders",
    description:
      "Playbooks, teardowns, and field reports on running lean SaaS marketing with AI agents.",
    url: "https://conduikt.com/blog/",
    type: "website",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": "https://conduikt.com/blog/#blog",
    name: "Conduikt Blog",
    description:
      "Playbooks, teardowns, and field reports on running lean SaaS marketing with AI agents.",
    url: "https://conduikt.com/blog/",
    publisher: {
      "@type": "Organization",
      name: "Conduikt",
      url: "https://conduikt.com/",
    },
    blogPost: BLOG_POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.datePublished,
      dateModified: p.dateModified,
      author: { "@type": "Person", name: p.author },
      url: `https://conduikt.com/blog/${p.slug}/`,
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <section className="pt-16 pb-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-hero text-text-primary leading-tight">
            The Conduikt Blog
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Playbooks, teardowns, and field reports on running lean SaaS
            marketing with AI agents. Written for founders who ship.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {BLOG_POSTS.map((post, i) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card
                hover
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="text-h2 text-text-primary mb-3">
                    {post.title}
                  </h2>
                  <p className="text-body text-text-secondary leading-relaxed mb-5 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4 text-small text-text-tertiary">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(post.datePublished)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readingTimeMinutes} min read
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-small font-medium text-accent">
                      Read post
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
