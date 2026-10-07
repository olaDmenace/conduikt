"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

// docs/DESIGN.md §States · Error: say what failed, offer Try again, and
// show the reference id so support can find it in the logs.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-5 rounded-lg border border-line bg-surface p-8">
      <p className="text-label text-danger">Something went wrong</p>
      <h1 className="text-display-s text-text">This page didn&apos;t load.</h1>
      <p className="text-body text-text-2">
        Your work is safe. Try again — if it keeps happening, send us the reference
        below and we&apos;ll look it up.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-text-3">Reference: {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go home</Link>
        </Button>
        <Button variant="ghost" asChild>
          <a href="mailto:hello@conduikt.com">Talk to us</a>
        </Button>
      </div>
    </div>
  );
}
