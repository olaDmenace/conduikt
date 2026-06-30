"use client";

import { createElement, useEffect, useRef, useState } from "react";

// Section heading reveal per DESIGN_SYSTEM.md motion specs:
//   clip-path inset reveal on enter, 700ms cubic-bezier(.2,.8,.2,1),
//   triggers when 15% of the element is in view, runs once.
//
// Honors prefers-reduced-motion: when the user opts out, the element
// renders fully visible from the start with no transition.
//
// Progressive enhancement: the SSR HTML ships with NO hidden styles, so
// no-JS users, slow connections, ad-blocked observers, and direct hash-
// anchor navigations all still see the heading. The hidden + animated
// state is only applied client-side AFTER mount, and only when the
// element is currently below the viewport (so it has somewhere to
// animate IN from). If the heading is already in view at mount, it
// stays visible — no flash, no animation.
//
// Usage:
//   <RevealOnScroll as="h2" className="text-h1 ...">Heading</RevealOnScroll>

type AsTag = "h1" | "h2" | "h3" | "div" | "p";

type RevealState = "initial" | "hidden" | "revealed";

export interface RevealOnScrollProps {
  children: React.ReactNode;
  as?: AsTag;
  className?: string;
  // Delay reveal by N ms — useful when stacking headings + subheads.
  delayMs?: number;
}

const HIDDEN_STYLE: React.CSSProperties = {
  clipPath: "inset(0 0 100% 0)",
  transform: "translateY(8px)",
  opacity: 0,
  transition:
    "clip-path 700ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 600ms ease-out",
  willChange: "clip-path, transform, opacity",
};

const REVEALED_STYLE: React.CSSProperties = {
  clipPath: "inset(0 0 0 0)",
  transform: "translateY(0)",
  opacity: 1,
  transition:
    "clip-path 700ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 600ms ease-out",
};

export function RevealOnScroll({
  children,
  as = "div",
  className,
  delayMs = 0,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);
  // "initial" = SSR + first client paint, no inline styles, fully visible.
  // "hidden"  = element is below the viewport; play the entry animation when it scrolls in.
  // "revealed" = animate to / hold the visible end state.
  const [state, setState] = useState<RevealState>("initial");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Reduced-motion users: stay in the initial (visible, no animation) state.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;
    if (!node) return;

    // Snapshot viewport state at hydration time.
    const rect = node.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const isAboveViewport = rect.bottom <= 0;
    const isBelowViewport = rect.top >= viewportH;
    const isInViewport = !isAboveViewport && !isBelowViewport;

    // Already in or past the viewport — just leave it visible. No flash,
    // no animation, no observer needed.
    if (isInViewport || isAboveViewport) return;

    // Below the viewport: hide it now and wait for it to scroll into view.
    setState("hidden");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setState("revealed"), delayMs);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [delayMs]);

  const style: React.CSSProperties | undefined =
    state === "hidden"
      ? HIDDEN_STYLE
      : state === "revealed"
        ? REVEALED_STYLE
        : undefined;

  return createElement(as, { ref, className, style }, children);
}
