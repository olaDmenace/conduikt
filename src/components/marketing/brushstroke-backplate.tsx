import * as React from "react";

// Brushstroke backplate for feature card icons. Replaces the previous
// rounded-square `bg-accent-muted p-3` backplate per DESIGN_SYSTEM.md.
// The path is hand-drawn-feeling — slight asymmetry and a tail at the
// bottom-left so each card's plate looks like it was painted, not
// generated. We rotate the SVG by a small random amount per card to
// reinforce the painted feel without forcing six identical strokes.
//
// Usage: wrap a Lucide icon and the plate scales to fit.
//
//   <BrushstrokeBackplate rotate={-1.5}>
//     <Search className="h-6 w-6" />
//   </BrushstrokeBackplate>

export interface BrushstrokeBackplateProps {
  children: React.ReactNode;
  // Rotation in degrees. Spec calls for ±2° random per card.
  rotate?: number;
  // Override the fill colour. Defaults to var(--accent-primary) so it
  // tracks the brand teal in light/dark modes automatically.
  fillVar?: string;
  // Width × height of the backplate in pixels. Default matches spec.
  size?: { w: number; h: number };
  className?: string;
}

export function BrushstrokeBackplate({
  children,
  rotate = 0,
  fillVar = "var(--accent-primary)",
  size = { w: 64, h: 46 },
  className,
}: BrushstrokeBackplateProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{
        width: size.w,
        height: size.h,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 70"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M6 38 C18 12, 48 6, 78 14 C108 22, 118 50, 102 60 C84 72, 44 64, 22 58 C8 54, 0 50, 6 38 Z"
          fill={fillVar}
          opacity="0.88"
        />
      </svg>
      {/* Counter-rotate the icon so it reads upright while the plate
          stays painted-looking. */}
      <span
        className="relative z-10 text-on-accent inline-flex items-center justify-center"
        style={{ transform: `rotate(${-rotate}deg)` }}
      >
        {children}
      </span>
    </div>
  );
}
