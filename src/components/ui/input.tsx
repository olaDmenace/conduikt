"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Input. 40px app / 48px marketing, 1px ink
// border, surface fill. Always paired with a label (visually hidden is
// fine — pass `hideLabel`). Placeholders are an example of what to type,
// not a label.
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  size?: "md" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hideLabel, hint, error, id, size = "md", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn("text-body-s text-text-2", hideLabel && "sr-only")}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-md border bg-surface px-3.5 font-sans text-[15px] text-text placeholder:text-text-3",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
            size === "lg" ? "h-12" : "h-10",
            error ? "border-danger" : "border-line-strong",
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-caption text-danger">{error}</p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-caption text-text-3">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

/** Field wrapper for non-Input controls (select, textarea). */
function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body-s text-text-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-danger">{error}</p>
      ) : hint ? (
        <p className="text-caption text-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

export { Input, Field };
