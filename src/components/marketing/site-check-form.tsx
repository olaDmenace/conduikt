"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeAuditUrl, PENDING_AUDIT_KEY } from "@/src/lib/onboarding/url";
import { cn } from "@/src/lib/utils/cn";

// "Check my site free" — used in the hero and the final CTA (both on
// photographs). Opens the public check at /check, which runs the audit
// and an agent preview, then gates the rest behind a free account. The
// URL is also kept on this device so the app picks it up after sign-up.

export function SiteCheckForm({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const uid = useId();
  const inputId = `site-check-url-${uid}`;
  const errorId = `site-check-error-${uid}`;
  const hintId = `site-check-hint-${uid}`;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeAuditUrl(value);
    if (!url) {
      setError("That doesn't look like a website address. Try: yourcompany.com");
      return;
    }
    try {
      localStorage.setItem(PENDING_AUDIT_KEY, url);
    } catch {
      // Private mode: the audit page just starts empty.
    }
    router.push(`/check?url=${encodeURIComponent(url)}`);
  }

  return (
    <form onSubmit={onSubmit} className={cn("flex w-full max-w-[560px] flex-col gap-2", className)} noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Your website address
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Paste your website address"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hintId}
          className="h-14 w-full min-w-0 rounded-md sm:h-[52px] sm:flex-1 border border-on-photo/40 bg-overlay/50 px-4 text-[15px] text-on-photo placeholder:text-on-photo/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-accent"
        />
        <button
          type="submit"
          className="inline-flex h-14 shrink-0 items-center justify-center rounded-md bg-accent px-6 text-[15px] font-medium text-white transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:bg-accent-hover sm:h-[52px]"
        >
          Check my site free
        </button>
      </div>
      {error ? (
        <p id={errorId} className="text-[13px] text-on-photo">{error}</p>
      ) : (
        <p id={hintId} className="text-[13px] text-on-photo/80">
          Free. No card. Your first results in about two minutes.
        </p>
      )}
    </form>
  );
}
