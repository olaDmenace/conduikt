import type { MetadataRoute } from "next";

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
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/auth/"],
    },
    sitemap: "https://conduikt.com/sitemap.xml",
  };
}
