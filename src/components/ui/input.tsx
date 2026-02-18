"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-small text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150",
            "focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none",
            error && "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(184,92,92,0.2)]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-small text-error">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
