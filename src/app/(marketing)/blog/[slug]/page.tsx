import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Calendar, Clock, User } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  getPublishedBlogPost,
  getRelatedBlogPosts,
  countWords,
} from "@/src/lib/blog/queries";

// Page revalidates every 60s so newly published or edited posts surface
// without a full Vercel rebuild. The list page uses the same window —
// see ../page.tsx.
export const revalidate = 60;

// generateStaticParams was previously used to pre-render every static
// post at build time. Now that posts come from the DB, we let Next.js
// generate them on-demand and revalidate. Skipping generateStaticParams
// means dynamicParams default applies (true) — unknown slugs render
// the [slug] route, which calls notFound() if the post doesn't exist.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: "Post not found" };

  const url = `https://conduikt.com/blog/${slug}/`;

  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.description,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.description,
      url,
      type: "article",
      publishedTime: post.date_published,
      modifiedTime: post.date_modified,
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
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.description,
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
  const post = await getPublishedBlogPost(slug);

  if (!post) {
    notFound();
  }

  const url = `https://conduikt.com/blog/${post.slug}/`;
  const wordCount = countWords(post);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.description,
    image: ["https://conduikt.com/og-image.png"],
    datePublished: post.date_published,
    dateModified: post.date_modified,
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
    wordCount,
    articleSection: post.tags[0] ?? "Marketing",
    inLanguage: "en-US",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://conduikt.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://conduikt.com/blog/" },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const related = await getRelatedBlogPosts(post.slug, 2);

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

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-12 md:px-10 md:pt-16">
        <div className="max-w-[760px]">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-body-s text-text-3"
          >
            <Link href="/" className="hover-link hover:text-text">
              Home
            </Link>
            <span className="mx-2" aria-hidden>/</span>
            <Link href="/blog" className="hover-link hover:text-text">
              Blog
            </Link>
          </nav>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-display-m text-text">{post.title}</h1>

          <p className="mt-6 text-lg leading-relaxed text-text-2">
            {post.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-line pt-5 text-body-s text-text-3">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.date_published}>
                {formatDate(post.date_published)}
              </time>
            </span>
            {post.reading_time_minutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.reading_time_minutes} min read
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 md:px-10">
        {/* Two render paths: legacy hand-written posts use the
            sections array; campaign-published posts ship with
            content_markdown. Either renders correctly. */}
        {post.content_markdown ? (
          <div className="prose-conduikt animate-in">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content_markdown}
            </ReactMarkdown>
          </div>
        ) : post.sections ? (
          <div className="prose-conduikt">
            {post.sections.map((section, i) => (
              <section
                key={i}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <h2>{section.heading}</h2>
                {section.body.map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        ) : null}
      </section>

      <section className="band-ink">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-5 px-4 py-14 md:px-10 md:py-[72px]">
          <p className="text-label text-ink-accent">Try it</p>
          <h2 className="max-w-[760px] text-display-s text-ink-text">
            Ready to try it?
          </h2>
          <p className="max-w-[560px] text-lg leading-relaxed text-ink-text-2">
            Conduikt&apos;s AI agents handle the work this post describes.
            Start free, no credit card.
          </p>
          <Button size="lg" asChild>
            <Link href={post.cta.href}>
              {post.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-10 md:py-20">
          <h2 className="mb-5 text-heading text-text">More posts</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="hover-card hover-card-quiet flex h-full flex-col rounded-lg border border-line bg-surface p-6"
              >
                <h3 className="mb-2 text-title text-text">{p.title}</h3>
                <p className="line-clamp-2 text-body-s text-text-2">
                  {p.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
