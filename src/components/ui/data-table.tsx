import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Table. Mono uppercase headers, 1px row
// lines, always wrapped in a horizontal scroller.
export function DataTable({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table
        className={cn(
          "w-full text-sm text-text",
          "[&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-text-3",
          "[&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-3",
          "[&_td]:tabular-nums",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}
