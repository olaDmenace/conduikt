import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/src/content/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://conduikt.com";
  const lastModified = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/features/", changeFrequency: "monthly", priority: 0.9 },
    { path: "/pricing/", changeFrequency: "monthly", priority: 0.9 },
    { path: "/compare/", changeFrequency: "monthly", priority: 0.8 },
    { path: "/guides/", changeFrequency: "weekly", priority: 0.7 },
    { path: "/blog/", changeFrequency: "weekly", priority: 0.8 },
    { path: "/launch/", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy/", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms/", changeFrequency: "yearly", priority: 0.3 },
    { path: "/data-deletion/", changeFrequency: "yearly", priority: 0.3 },
  ];

  const compareSlugs = ["jasper", "copy-ai", "writesonic", "surfer-seo"];
  const guideSlugs = [
    "social-media-marketing",
    "seo-content-strategy",
    "email-marketing-automation",
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${baseUrl}${r.path}`,
      lastModified,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...compareSlugs.map((slug) => ({
      url: `${baseUrl}/compare/${slug}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...guideSlugs.map((slug) => ({
      url: `${baseUrl}/guides/${slug}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...BLOG_POSTS.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}/`,
      lastModified: new Date(p.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
