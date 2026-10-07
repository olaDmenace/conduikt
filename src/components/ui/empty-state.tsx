import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Empty state. One sentence, one primary
// action. One shared component — never re-implemented per page.
export function EmptyState({
  icon,
  title,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-dashed border-line p-8 text-center",
        className
      )}
    >
      {icon && <div className="text-text-3" aria-hidden>{icon}</div>}
      <p className="max-w-[40ch] text-body text-text-2">{title}</p>
      {action}
    </div>
  );
}
