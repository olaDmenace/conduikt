"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

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
    <div className="mb-6 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 animate-in">
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-small text-text-primary">{message}</p>
          {details && details.length > 0 && (
            <ul className="mt-2 space-y-1">
              {details.map((d, i) => (
                <li key={i} className="text-small text-text-secondary">
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
          className="shrink-0 p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
