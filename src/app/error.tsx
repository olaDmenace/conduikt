"use client";

import { useEffect } from "react";

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
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <div className="text-center max-w-md px-6">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-error/10 border border-error/20">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="text-h1 text-text-primary mb-2">Something went wrong</h1>
        <p className="text-body text-text-secondary mb-2">
          An unexpected error occurred. This has been logged.
        </p>
        {error.digest && (
          <p className="text-small text-text-tertiary font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-[0.875rem] font-medium text-surface-0 transition-all hover:brightness-110"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-border-strong px-6 py-3 text-[0.875rem] font-medium text-text-secondary transition-all hover:bg-surface-2"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
