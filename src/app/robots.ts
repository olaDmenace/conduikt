import type { MetadataRoute } from "next";

// Paths that no crawler should index: the app itself and its API. The
// marketing site, blog and docs stay open.
const PRIVATE_PATHS = ["/dashboard/", "/api/", "/auth/"];

// Answer-engine and AI-search crawlers, allowed explicitly so a future
// blanket rule (or a CDN default) cannot silently drop conduikt.com out of
// ChatGPT, Claude, Perplexity and Google's AI features. Each gets its own
// group: some of these bots only honour a group that names them.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deployments share the same code as production but get a
  // different hostname (conduikt-git-*.vercel.app). We don't want those
  // indexed alongside the canonical conduikt.com — block all crawling on
  // anything that isn't the production environment.
  const isProduction = process.env.VERCEL_ENV === "production";

  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: "https://conduikt.com/sitemap.xml",
  };
}
