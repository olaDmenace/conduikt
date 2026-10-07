"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeAuditUrl } from "@/src/lib/onboarding/url";

// Final-CTA form (docs/DESIGN.md band 9): "Check my site free". The URL is
// kept on this device and the visitor goes to sign up; the Magic Audit
// page picks it up afterwards so they never retype it.
export const PENDING_AUDIT_KEY = "conduikt:pending-audit-url";

export function SiteCheckForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    router.push("/signup");
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[560px] flex-col gap-2" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="site-check-url" className="sr-only">
          Your website address
        </label>
        <input
          id="site-check-url"
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
          aria-describedby={error ? "site-check-error" : "site-check-hint"}
          className="h-[52px] min-w-0 flex-1 rounded-md border border-on-photo/40 bg-overlay/50 px-4 text-[15px] text-on-photo placeholder:text-on-photo/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-accent"
        />
        <button
          type="submit"
          className="inline-flex h-[52px] items-center justify-center rounded-md bg-accent px-6 text-[15px] font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-accent-hover"
        >
          Check my site free
        </button>
      </div>
      {error ? (
        <p id="site-check-error" className="text-[13px] text-on-photo">{error}</p>
      ) : (
        <p id="site-check-hint" className="text-[13px] text-on-photo/80">
          Free. No card. Your first results in about two minutes.
        </p>
      )}
    </form>
  );
}
