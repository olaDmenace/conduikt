"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FirstWeekPanel } from "@/src/components/first-week/first-week-panel";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";

// Every agent's latest run on this project's site. Projects that never had
// one can start it here, from the website already on the project.
export default function FirstWeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [started, setStarted] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ text: string; needsUrl?: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/onboarding/first-week?projectId=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { started: false }))
      .then((s) => setStarted(!!s.started))
      .catch(() => setStarted(false));
  }, [id]);

  async function start() {
    setStarting(true);
    setError(null);
    const res = await fetch("/api/onboarding/first-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id }),
    });
    const body = await res.json().catch(() => ({}));
    setStarting(false);
    if (!res.ok) {
      setError({ text: body.error ?? "Your agents didn't start. Try again.", needsUrl: res.status === 400 });
      return;
    }
    setStarted(true);
  }

  if (started === null) return <Skeleton className="h-64 w-full" />;
  if (!started) {
    return (
      <div className="space-y-3">
        <EmptyState
          title="Your agents haven't run on this site yet. Start them and they'll audit it, plan and write your first week."
          action={
            <Button onClick={start} disabled={starting}>
              {starting ? "Starting your agents…" : "Run every agent on this site"}
            </Button>
          }
        />
        {error && (
          <p role="alert" className="text-center text-body-s text-danger">
            {error.text}{" "}
            {error.needsUrl && (
              <Link href={`/projects/${id}/settings`} className="hover-link underline underline-offset-2">
                Open project settings
              </Link>
            )}
          </p>
        )}
      </div>
    );
  }
  return <FirstWeekPanel projectId={id} />;
}
