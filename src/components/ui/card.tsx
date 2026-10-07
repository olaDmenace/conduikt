import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Components · Card. 8px radius, 1px line, flat. Emphasis
// is a same-width accent border, never a shadow or a scale.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; emphasis?: boolean }
>(({ className, hover = false, emphasis = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-surface p-4 md:p-6 transition-colors duration-[var(--duration-fast)]",
      emphasis ? "border-accent" : "border-line",
      hover && "cursor-pointer hover:border-accent",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/** Card on the ink surface — bands, the sidebar plan tile, "waiting for you". */
const InkCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-ink-line bg-ink-surface p-5 text-ink-text",
      className
    )}
    {...props}
  />
));
InkCard.displayName = "InkCard";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5 pb-4", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-title text-text", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-body-s text-text-2", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center border-t border-line pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, InkCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
