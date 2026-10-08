"use client";

import { useState } from "react";
import { Info, X } from "@/src/components/ui/lucide-icons";

interface ExpectationBannerProps {
  /** The main message — lead with "this takes time" */
  message: string;
  /** Optional bullet points for context */
  details?: string[];
  /** localStorage key to persist dismissal */
  storageKey: string;
}

export function ExpectationBanner({
  message,
  details,
  storageKey,
}: ExpectationBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "dismissed";
  });

  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-lg border border-line bg-surface px-4 py-3 animate-in">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-3" />
        <div className="min-w-0 flex-1">
          <p className="text-body-s text-text">{message}</p>
          {details && details.length > 0 && (
            <ul className="mt-2 space-y-1">
              {details.map((d, i) => (
                <li key={i} className="text-body-s text-text-2">
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(storageKey, "dismissed");
          }}
          className="shrink-0 rounded-md p-1 text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface-2 hover:text-text"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
