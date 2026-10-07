import * as React from "react";
import Link from "next/link";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Sidebar item. 36px, 6px radius. The current
// page gets aria-current="page" and the ink treatment. In the 64px icon
// rail the label is visually hidden (still announced) and a tooltip shows
// on hover / keyboard focus — not a `title` attribute.
//
// `labelClassName` carries the responsive hiding rule from the rail, e.g.
// "md:max-rail:sr-only" — the same class decides the tooltip.
export function SidebarItem({
  href,
  icon,
  label,
  current,
  count,
  onClick,
  labelClassName,
  collapsed = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  current: boolean;
  count?: number;
  onClick?: () => void;
  labelClassName?: string;
  /** The user collapsed the rail at wide widths: show tooltips there too. */
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] delay-[var(--hover-delay)]",
        "text-text-2 hover:bg-surface-2 hover:text-text",
        "aria-[current=page]:bg-ink aria-[current=page]:text-ink-text"
      )}
    >
      <span className="relative shrink-0" aria-hidden>
        {icon}
        {count !== undefined && count > 0 && (
          // Dot on the icon so the count survives in the compact rail.
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
        )}
      </span>
      <span className={cn("flex-1 truncate", labelClassName)}>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-ink px-1.5 font-mono text-[11px] text-ink-text group-aria-[current=page]:bg-ink-surface",
            labelClassName
          )}
        >
          {count}
        </span>
      )}
      <RailTooltip label={count ? `${label} (${count})` : label} collapsed={collapsed} />
    </Link>
  );
}

/**
 * Tooltip for the icon rail. Only visible at widths where the label is
 * hidden; at other widths the `hidden` default wins. Shown on hover and
 * on keyboard focus.
 */
export function RailTooltip({ label, collapsed = false }: { label: string; collapsed?: boolean }) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-caption text-ink-text",
        "md:max-rail:group-hover:block md:max-rail:group-focus-visible:block",
        collapsed && "rail:group-hover:block rail:group-focus-visible:block"
      )}
    >
      {label}
    </span>
  );
}

/** Section label in the rail: mono 11px uppercase. */
export function SidebarSection({
  label,
  labelClassName,
  children,
}: {
  label: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5 pt-3">
      <p className={cn("px-2.5 pb-1 text-label text-text-3", labelClassName)}>{label}</p>
      {children}
    </div>
  );
}
