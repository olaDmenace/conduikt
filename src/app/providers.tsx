"use client";

import { IconProvider, DEFAULT_ICON_CONFIGS } from "@icon-park/react";
import "@icon-park/react/styles/index.css";

// docs/DESIGN.md §Icons: outline theme, stroke 3 on IconPark's 48px grid
// (lighter than the default 4, closer to Space Grotesk 300), round caps.
// Colour always comes from a token: pass fill="currentColor" or a var().
const iconConfig = {
  ...DEFAULT_ICON_CONFIGS,
  theme: "outline" as const,
  size: 20,
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  prefix: "ck",
};

export function Providers({ children }: { children: React.ReactNode }) {
  return <IconProvider value={iconConfig}>{children}</IconProvider>;
}
