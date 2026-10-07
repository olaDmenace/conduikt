"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Motion. Fade-up 10px over 700ms when the element
// crosses 15% visibility. Runs once. Stagger: pass `step` (0-4) for
// 80ms increments, five steps maximum. Reduced motion shows the final
// state (handled in globals.css).
export function Reveal({
  as: Tag = "div",
  step = 0,
  className,
  children,
  ...props
}: {
  as?: React.ElementType;
  step?: number;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${Math.min(step, 4) * 80}ms` }}
      {...props}
    >
      {children}
    </Tag>
  );
}
