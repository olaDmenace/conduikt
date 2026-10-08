"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { RotateCcw, LayoutDashboard, Mail } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Conduikt mark */}
        <Link
          href="/"
          className="mx-auto mb-10 inline-flex items-center gap-2.5 text-text"
          aria-label="Conduikt home"
        >
          <Image src="/conduikt-icon.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-medium tracking-tight">
            Conduikt
          </span>
        </Link>

        <p className="mb-3 text-label text-danger">Error</p>
        <h1 className="mb-4 text-display-s text-text">
          This page didn&apos;t load
        </h1>
        <p className="mb-1 text-body text-text-2">
          Something went wrong on our side. We&apos;ve been told about it
          and we&apos;re looking into it.
        </p>
        <p className="mb-6 text-body text-text-2">
          Retry usually works. If it doesn&apos;t, go back to your dashboard.
        </p>

        {error.digest && (
          <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5">
            <span className="text-label text-text-3">
              Reference
            </span>
            <span className="font-mono text-body-s text-text-2">
              {error.digest}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        <p className="mt-10 text-body-s text-text-3">
          Still broken?{" "}
          <a
            href="mailto:hello@conduikt.com"
            className="hover-link inline-flex items-center gap-1 text-accent hover:text-accent-hover"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            hello@conduikt.com
          </a>
        </p>
      </div>
    </div>
  );
}
