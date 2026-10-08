import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, Calendar, Clock } from "@/src/components/ui/lucide-icons";
import { Badge } from "@/src/components/ui/badge";
import { listPublishedBlogPosts } from "@/src/lib/blog/queries";

// Re-render every minute. New posts published via the in-app
// "Publish to blog" button surface within 60 seconds without a
// full deploy. Detail pages also use this (see [slug]/page.tsx).
export const revalidate = 60;

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

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts();

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
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date_published,
      dateModified: p.date_modified,
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

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-16 md:px-10 md:pt-24">
        <div className="flex max-w-[760px] flex-col gap-4">
          <p className="text-label text-accent">Blog</p>
          <h1 className="text-display-m text-text">The Conduikt blog</h1>
          <p className="text-lg leading-relaxed text-text-2">
            Playbooks, teardowns, and field reports on running lean SaaS
            marketing with AI agents. Written for founders who ship.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-24 md:px-10">
        <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {posts.map((post, i) => (
            <li key={post.slug} className="flex">
              <Link
                href={`/blog/${post.slug}`}
                className="group hover-card hover-card-quiet animate-in flex w-full flex-col rounded-lg border border-line bg-surface p-6 md:p-7"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h2 className="mb-3 text-heading text-text transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] group-hover:text-accent-hover">
                  {post.title}
                </h2>
                <p className="mb-5 line-clamp-3 text-body text-text-2">
                  {post.excerpt}
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-4 text-caption text-text-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(post.date_published)}
                    </span>
                    {post.reading_time_minutes && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {post.reading_time_minutes} min read
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-body-s font-medium text-accent-hover">
                    Read post
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
