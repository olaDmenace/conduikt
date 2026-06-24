import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
