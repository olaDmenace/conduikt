import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  // Packages with native binaries — leave them outside the bundler so they
  // load from node_modules at runtime. Without this, Vercel Functions fail
  // to start for routes that import these (the bracket-filler cron uses both).
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
