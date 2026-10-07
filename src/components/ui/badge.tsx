import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Chip. 22px, mono 11px, 4px radius.
// Status chips always carry a word — colour never carries meaning alone.
// `Badge` is the legacy name; `Chip` is the v2 name. Same component.
const badgeVariants = {
  default: "bg-accent-soft text-accent-hover", // running, needs you
  secondary: "bg-surface-2 text-text-3", // queued, neutral
  success: "bg-teal-soft text-teal", // done, connected
  warning: "bg-accent-soft text-warning", // needs approval, quota
  error: "bg-surface-2 text-danger", // failed
  info: "bg-surface-2 text-text-2",
  count: "bg-ink text-ink-text",
  // Tier chips
  free: "bg-teal-soft text-teal",
  pro: "bg-accent-soft text-accent-hover",
  growth: "bg-ink text-ink-text",
  agency: "bg-ink text-ink-text",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-sm px-2 font-mono text-[11px] font-medium uppercase tracking-wide whitespace-nowrap",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

const Chip = Badge;
export type ChipProps = BadgeProps;

export { Badge, Chip, badgeVariants };
