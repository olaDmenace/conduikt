"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard, Mail } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Conduikt mark */}
        <Link
          href="/"
          className="mx-auto mb-10 inline-flex items-center gap-2"
          aria-label="Conduikt home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
            <span className="text-sm font-bold text-surface-0">C</span>
          </div>
          <span className="font-display text-lg text-text-primary">
            Conduikt
          </span>
        </Link>

        {/* Error badge */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent-muted">
          <AlertTriangle
            className="h-7 w-7 text-accent"
            strokeWidth={1.75}
          />
        </div>

        <h1 className="text-h1 text-text-primary mb-3">
          Something went sideways
        </h1>
        <p className="text-body text-text-secondary mb-1 leading-relaxed">
          An unexpected error tripped us up. Our team has been notified
          automatically, and we&apos;re already looking into it.
        </p>
        <p className="text-body text-text-secondary mb-6 leading-relaxed">
          You can retry the action — it often works the second time — or head
          back to your dashboard.
        </p>

        {error.digest && (
          <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5">
            <span className="text-caption text-text-tertiary uppercase tracking-wider">
              Reference
            </span>
            <span className="font-mono text-small text-text-secondary">
              {error.digest}
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[0.875rem] font-medium text-surface-0 transition-all hover:brightness-110"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-5 py-2.5 text-[0.875rem] font-medium text-text-secondary transition-all hover:bg-surface-2 hover:text-text-primary"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <p className="mt-10 text-small text-text-tertiary">
          Still broken?{" "}
          <a
            href="mailto:hello@conduikt.com"
            className="inline-flex items-center gap-1 text-accent hover:text-accent-hover transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            hello@conduikt.com
          </a>
        </p>
      </div>
    </div>
  );
}
