"use client";

import { createElement, useEffect, useRef, useState } from "react";

// Section heading reveal per DESIGN_SYSTEM.md motion specs:
//   clip-path inset reveal on enter, 700ms cubic-bezier(.2,.8,.2,1),
//   triggers when 15% of the element is in view, runs once.
//
// Honors prefers-reduced-motion: when the user opts out, the element
// renders fully visible from the start with no transition.
//
// Usage:
//   <RevealOnScroll as="h2" className="text-h1 ...">Heading</RevealOnScroll>
//
// We use a div wrapper with overflow:hidden so the clip-path reveal
// reads cleanly even on multi-line headings.

type AsTag = "h1" | "h2" | "h3" | "div" | "p";

export interface RevealOnScrollProps {
  children: React.ReactNode;
  as?: AsTag;
  className?: string;
  // Delay reveal by N ms — useful when stacking headings + subheads.
  delayMs?: number;
}

export function RevealOnScroll({
  children,
  as = "div",
  className,
  delayMs = 0,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Reduced-motion users: skip the animation entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setRevealed(true), delayMs);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [delayMs]);

  return createElement(
    as,
    {
      ref,
      className,
      style: {
        // The clip-path starts fully clipped from the top; combined with
        // an 8px translateY + opacity 0, the heading appears to slide up
        // from below the line as the clip releases.
        clipPath: revealed ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        opacity: revealed ? 1 : 0,
        transition:
          "clip-path 700ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 600ms ease-out",
        willChange: "clip-path, transform, opacity",
      },
    },
    children
  );
}
