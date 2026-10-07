import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · KPI strip. Cells joined by 1px gaps. Every
// number says what it counts; every delta carries a sign. The last cell
// may be ink ("Waiting for you"). Collapses to 2 columns under 1000px.
export interface KpiCell {
  label: string;
  /** Pre-formatted value — include the unit ("87 out of 100", "3,420 views"). */
  value: string;
  /** Signed delta, e.g. "+12% vs last week". Sign is mandatory. */
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  context?: string;
  ink?: boolean;
}

export function KpiStrip({ cells, className }: { cells: KpiCell[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line min-[1000px]:grid-cols-5",
        className
      )}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          className={cn(
            "flex flex-col gap-1.5 p-5",
            c.ink ? "bg-ink text-ink-text" : "bg-surface"
          )}
        >
          <dt className={cn("text-label", c.ink ? "text-ink-text-3" : "text-text-3")}>
            {c.label}
          </dt>
          <dd className="text-numeric text-[1.75rem]">{c.value}</dd>
          {c.delta && (
            <dd
              className={cn(
                "text-caption",
                c.ink
                  ? "text-ink-text-2"
                  : c.deltaTone === "up"
                  ? "text-teal"
                  : c.deltaTone === "down"
                  ? "text-warning"
                  : "text-text-3"
              )}
            >
              {c.delta}
            </dd>
          )}
          {c.context && (
            <dd className={cn("text-caption", c.ink ? "text-ink-text-3" : "text-text-3")}>
              {c.context}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
