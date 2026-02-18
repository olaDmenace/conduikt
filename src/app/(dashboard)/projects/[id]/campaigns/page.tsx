"use client";

import { Megaphone } from "lucide-react";
import { PageHeader } from "@/src/components/layout/page-header";
import { ComingSoon } from "@/src/components/layout/coming-soon";

export default function CampaignsPage() {
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Multi-channel campaign orchestration"
      />
      <ComingSoon
        icon={Megaphone}
        title="Campaigns Coming Soon"
        description="Launch coordinated multi-channel campaigns — social, email, and content — all from one place."
      />
    </div>
  );
}
