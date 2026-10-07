"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Button. Square (6px), flat, no gradient,
// no glow, no scale. One primary per screen or band.
const buttonVariants = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  outline: "border border-line-strong bg-transparent text-text hover:bg-surface-2",
  quiet: "border border-line bg-surface text-text hover:bg-surface-2",
  // On ink bands: outline in ink-text.
  "outline-ink": "border border-ink-text bg-transparent text-ink-text hover:bg-ink-surface",
  ghost: "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text",
  danger: "border border-danger bg-transparent text-danger hover:bg-surface-2",
  // Legacy alias: "secondary" was the hairline outline in v1.
  secondary: "border border-line-strong bg-transparent text-text hover:bg-surface-2",
};

const buttonSizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-sm", // 36px — app default
  lg: "h-12 px-5 text-[15px]", // 48px — marketing
  icon: "h-9 w-9 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium whitespace-nowrap",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] delay-[var(--hover-delay)]",
          "disabled:opacity-50 disabled:pointer-events-none",
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

/**
 * Icon-only button. `label` is required: it becomes the aria-label so
 * every icon control is announced (docs/DESIGN.md §Accessibility).
 */
export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  variant?: "ghost" | "quiet" | "outline";
  size?: "sm" | "md";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "ghost", size = "md", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] delay-[var(--hover-delay)]",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";

export { Button, IconButton, buttonVariants };
