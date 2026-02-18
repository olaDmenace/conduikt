"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/src/lib/utils/cn";

const buttonVariants = {
  primary:
    "bg-gradient-to-br from-accent to-[#C88550] text-surface-0 shadow-[0_0_20px_var(--accent-glow)] hover:brightness-110 hover:scale-[1.02] active:brightness-95 active:scale-[0.98]",
  secondary:
    "bg-transparent border border-border-strong text-text-primary hover:bg-surface-3",
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
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium font-sans transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
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
