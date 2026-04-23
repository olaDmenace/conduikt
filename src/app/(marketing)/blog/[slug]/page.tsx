import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import {
  BLOG_POSTS,
  getBlogPost,
  getRelatedPosts,
} from "@/src/content/blog/posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post not found" };

  const url = `https://conduikt.com/blog/${slug}/`;

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og-image.png"],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const url = `https://conduikt.com/blog/${post.slug}/`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.description,
    image: ["https://conduikt.com/og-image.png"],
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: {
      "@type": "Person",
      name: post.author,
      url: "https://www.linkedin.com/in/olayinkafagbenro/",
    },
    publisher: {
      "@type": "Organization",
      name: "Conduikt",
      logo: {
        "@type": "ImageObject",
        url: "https://conduikt.com/icon-512.png",
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: post.tags.join(", "),
    wordCount: post.sections.reduce(
      (sum, s) => sum + s.body.join(" ").split(/\s+/).length,
      0
    ),
    articleSection: post.tags[0] ?? "Marketing",
    inLanguage: "en-US",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://conduikt.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://conduikt.com/blog/",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: url,
      },
    ],
  };

  const related = getRelatedPosts(post.slug, 2);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="pt-12 pb-12">
        <div className="mx-auto max-w-3xl px-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-small text-text-tertiary"
          >
            <Link href="/" className="hover:text-text-primary transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link
              href="/blog"
              className="hover:text-text-primary transition-colors"
            >
              Blog
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-hero text-text-primary leading-tight">
            {post.title}
          </h1>

          <p className="mt-6 text-lg text-text-secondary leading-relaxed">
            {post.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5 text-small text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.datePublished}>
                {formatDate(post.datePublished)}
              </time>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {post.readingTimeMinutes} min read
            </span>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          {post.sections.map((section, i) => (
            <Card
              key={i}
              className="animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent>
                <h2 className="text-h2 text-text-primary mb-4">
                  {section.heading}
                </h2>
                <div className="space-y-4">
                  {section.body.map((paragraph, j) => (
                    <p
                      key={j}
                      className="text-body text-text-secondary leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <Card className="border-accent shadow-[0_0_30px_var(--accent-glow)]">
            <CardContent className="text-center py-10">
              <h2 className="text-h1 text-text-primary mb-2">
                Ready to try it?
              </h2>
              <p className="text-lg text-text-secondary mb-6">
                Conduikt&apos;s AI agents handle the work this post describes.
                Start free — no credit card.
              </p>
              <Button size="lg" asChild>
                <Link href={post.cta.href}>
                  {post.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {related.length > 0 && (
        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-6">
            <h3 className="text-h2 text-text-primary mb-5">More posts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`}>
                  <Card hover className="h-full">
                    <CardContent>
                      <h4 className="text-h3 text-text-primary mb-2">
                        {p.title}
                      </h4>
                      <p className="text-small text-text-secondary line-clamp-2">
                        {p.excerpt}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
