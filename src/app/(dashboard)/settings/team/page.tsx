"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/src/components/layout/page-header";
import { ComingSoon } from "@/src/components/layout/coming-soon";

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="Collaborate with your team"
      />
      <ComingSoon
        icon={Users}
        title="Team Collaboration Coming Soon"
        description="Invite team members, assign roles, and collaborate on campaigns together."
      />
    </div>
  );
}
