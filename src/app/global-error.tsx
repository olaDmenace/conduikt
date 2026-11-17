"use client";

import { useEffect } from "react";
import Link from "next/link";
import "@/src/styles/globals.css";
import { Button } from "@/src/components/ui/button";

// Last-resort boundary. It only renders when the root layout itself throws,
// so it has to ship its own <html> and <body>; nothing from
// src/app/layout.tsx (fonts, providers, analytics) is available here.
// Colours and type come from the globals.css tokens; the font variables
// are not set, so the stack falls back to system-ui.
//
// docs/DESIGN.md §States · Error: say what failed, offer Try again, show
// the reference id so support can find it in the logs.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en-US">
      <body className="font-sans antialiased bg-ground text-text">
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg space-y-5 rounded-lg border border-line bg-surface p-8">
            <p className="text-label text-danger">Something went wrong</p>
            <h1 className="text-display-s text-text">Conduikt didn&apos;t load.</h1>
            <p className="text-body text-text-2">
              Your work is safe. Try again. If it keeps happening, send us the
              reference below and we&apos;ll look it up.
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-text-3">Reference: {error.digest}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Go home</Link>
              </Button>
            </div>
            <p className="text-body-s text-text-3">
              Still stuck?{" "}
              <a href="mailto:hello@conduikt.com" className="hover-link text-accent">
                hello@conduikt.com
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
