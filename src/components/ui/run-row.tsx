import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Run row. Mono time column, title + sub,
// one action. A live run is tinted accent-soft with a pulsing dot — never
// a spinner. Under 768px the time drops into the sub line.
export function RunRow({
  time,
  title,
  sub,
  action,
  live = false,
}: {
  time: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-3.5 border-t border-line px-4 py-3 md:grid-cols-[110px_1fr_auto]",
        live && "bg-accent-soft"
      )}
    >
      <span className="hidden font-mono text-xs text-text-3 md:block">
        {live ? (
          <span className="inline-flex items-center gap-2">
            <span className="live-dot" aria-hidden />
            Live
          </span>
        ) : (
          time
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-title text-text">{title}</p>
        {/* On phones the time column folds into this line. */}
        <p className="truncate text-body-s text-text-2">
          <span className="md:hidden">{live ? "Live" : time}{sub ? " · " : ""}</span>
          {sub}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
