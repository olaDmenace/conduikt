"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FirstWeekPanel } from "@/src/components/first-week/first-week-panel";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";

// The project's "first week" pack: every agent's first run on the site.
export default function FirstWeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [started, setStarted] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/onboarding/first-week?projectId=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { started: false }))
      .then((s) => setStarted(!!s.started))
      .catch(() => setStarted(false));
  }, [id]);

  if (started === null) return <Skeleton className="h-64 w-full" />;
  if (!started) {
    return (
      <EmptyState
        title="Your agents haven't had a first run on this site yet."
        action={
          <Button asChild>
            <Link href="/onboarding/magic-audit">Check my site</Link>
          </Button>
        }
      />
    );
  }
  return <FirstWeekPanel projectId={id} />;
}
