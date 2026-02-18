"use client";

import { Plug } from "lucide-react";
import { PageHeader } from "@/src/components/layout/page-header";
import { ComingSoon } from "@/src/components/layout/coming-soon";

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect your marketing tools"
      />
      <ComingSoon
        icon={Plug}
        title="Integrations Coming Soon"
        description="Connect X, LinkedIn, email providers, and analytics tools to publish and track content automatically."
      />
    </div>
  );
}
