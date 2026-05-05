"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/src/lib/utils/cn";

const buttonVariants = {
  // Primary: brand-orange gradient with a soft accent glow that
  // strengthens on hover.
  primary:
    "bg-gradient-to-br from-[#D9663A] to-[#B24E27] text-on-accent shadow-[0_0_20px_var(--accent-glow)] hover:shadow-[0_0_32px_var(--accent-glow)] hover:brightness-110 hover:scale-[1.015] active:brightness-95 active:scale-[0.985]",
  // Secondary: hairline outline. Hover picks up an accent border and
  // a very soft accent halo so the button doesn't feel inert next to
  // the primary CTA's glow.
  secondary:
    "bg-transparent border border-border-strong text-text-primary hover:bg-surface-3 hover:border-accent/40 hover:shadow-[0_0_16px_var(--accent-glow)]",
  ghost:
    "bg-transparent border-none text-text-secondary hover:text-text-primary",
  danger:
    "bg-error/10 text-error border border-error/20 hover:bg-error/20",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-[0.8125rem]",
  md: "px-6 py-3 text-[0.875rem]",
  lg: "px-8 py-3.5 text-[0.9375rem]",
  icon: "p-2.5",
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
          // Soft-cubic easing + 250ms aligns with the rest of the UI —
          // slower than the previous 150ms snap, faster than section
          // reveals.
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium font-sans transition-all duration-[250ms] ease-[var(--ease-out-soft)] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
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

export { Button, buttonVariants };
