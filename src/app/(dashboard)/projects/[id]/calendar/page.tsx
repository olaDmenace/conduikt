"use client";

import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/src/components/layout/page-header";
import { ComingSoon } from "@/src/components/layout/coming-soon";

export default function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Schedule and manage content publishing"
      />
      <ComingSoon
        icon={CalendarDays}
        title="Content Calendar Coming Soon"
        description="Schedule posts across channels, visualize your content pipeline, and never miss a publishing window."
      />
    </div>
  );
}
