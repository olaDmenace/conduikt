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
  // null = unknown yet; false = the project has no website address.
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/onboarding/first-week?projectId=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { started: false }))
      .then((s) => setStarted(!!s.started))
      .catch(() => setStarted(false));
    fetch(`/api/projects/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setHasWebsite(!!(p?.project ?? p)?.website_url))
      .catch(() => setHasWebsite(true));
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

  const overviewLink = (
    <div className="flex justify-end">
      <Button asChild>
        <Link href="/dashboard">Go to your overview</Link>
      </Button>
    </div>
  );

  if (started === null || hasWebsite === null) return <Skeleton className="h-64 w-full" />;
  if (!started && !hasWebsite) {
    // No site to check yet: the first page comes from Missing Pages, built
    // from the services and location given in onboarding.
    return (
      <div className="space-y-3">
        {overviewLink}
        <EmptyState
          title="No website yet. We'll build your first page from your answers, then the rest of your first week starts from it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href={`/projects/${id}/missing-pages`}>See your first page</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/projects/${id}/settings`}>Add a website address</Link>
              </Button>
            </div>
          }
        />
        {overviewLink}
      </div>
    );
  }
  if (!started) {
    return (
      <div className="space-y-3">
        {overviewLink}
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
        {overviewLink}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {overviewLink}
      <FirstWeekPanel projectId={id} />
      {overviewLink}
    </div>
  );
}
