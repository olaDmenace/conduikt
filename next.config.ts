import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old agent routes → new /agents/ paths
      {
        source: "/projects/:id/audit",
        destination: "/projects/:id/agents/seo-audit",
        permanent: true,
      },
      {
        source: "/projects/:id/blog",
        destination: "/projects/:id/agents/blog",
        permanent: true,
      },
      {
        source: "/projects/:id/keywords",
        destination: "/projects/:id/agents/keywords",
        permanent: true,
      },
      {
        source: "/projects/:id/growth",
        destination: "/projects/:id/agents/growth",
        permanent: true,
      },
      {
        source: "/projects/:id/calendar",
        destination: "/projects/:id/agents/calendar",
        permanent: true,
      },
      {
        source: "/projects/:id/content",
        destination: "/projects/:id/agents/content",
        permanent: true,
      },
      {
        source: "/projects/:id/campaigns",
        destination: "/projects/:id/agents/campaigns",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
