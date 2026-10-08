// Single source of truth for PDF colours and type — docs/DESIGN.md
// Direction C, resolved to hex because @react-pdf can't read CSS variables.
// Keep in step with the tokens in src/styles/globals.css.
//
// Reports print on sand with ink bands, one orange accent, and teal only
// for data (scores, charts, "good" states). Light pages: they print well
// and match the product.

import path from "node:path";
import { Font } from "@react-pdf/renderer";

const BASE = {
  // Surfaces
  ground: "#EAE4D5", // page
  surface: "#F6F2E9", // cards
  surface2: "#E0D9C8",
  line: "#D9D1C0",
  lineStrong: "#1E2A2E",

  // Ink band (cover, headers)
  ink: "#1E2A2E",
  inkSurface: "#263439",
  inkLine: "#34444A",
  inkText: "#EAE4D5",
  inkText2: "#B9C2C0",
  inkText3: "#8FA0A3",
  inkAccent: "#E78457",
  inkTeal: "#3FA09A",

  // Text
  text: "#1E2A2E",
  text2: "#4A5559",
  text3: "#5A6568",

  // Accent (actions, emphasis) and data
  accent: "#B24E27",
  accentDisplay: "#D9663A",
  accentSoft: "#F3E3DA",
  teal: "#1F6B66",
  tealSoft: "#E3F0EE",

  // States — teal is "good", accent is "needs work", danger is "broken".
  success: "#1F6B66",
  warning: "#B24E27",
  error: "#A33A2A",

  white: "#FFFFFF",

} as const;

export const PDF_BRAND = {
  ...BASE,
  // Legacy names, so templates keep compiling while they move to the
  // names above.
  surface0: BASE.ground,
  surface1: BASE.surface,
  border: BASE.line,
  accentDark: BASE.accent,
  accentSecondary: BASE.teal,
  accentSecondaryDark: BASE.teal,
  cream: BASE.accentSoft,
  textPrimary: BASE.text,
  textSecondary: BASE.text2,
  textTertiary: BASE.text3,
  info: BASE.text2,
} as const;

export type PdfBrand = typeof PDF_BRAND;

export const PDF_FONTS = {
  display: "Space Grotesk",
  body: "Geist",
  mono: "JetBrains Mono",
} as const;

let registered = false;

/** Register the bundled TTFs once per process. Call before rendering. */
export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  Font.register({
    family: PDF_FONTS.display,
    fonts: [
      { src: path.join(dir, "SpaceGrotesk-300.ttf"), fontWeight: 300 },
      { src: path.join(dir, "SpaceGrotesk-500.ttf"), fontWeight: 500 },
    ],
  });
  Font.register({
    family: PDF_FONTS.body,
    fonts: [
      { src: path.join(dir, "Geist-400.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Geist-500.ttf"), fontWeight: 500 },
      { src: path.join(dir, "Geist-600.ttf"), fontWeight: 600 },
      // "bold" in older templates maps to the heaviest cut we ship.
      { src: path.join(dir, "Geist-600.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: PDF_FONTS.mono,
    fonts: [
      { src: path.join(dir, "JetBrainsMono-400.ttf"), fontWeight: 400 },
      { src: path.join(dir, "JetBrainsMono-500.ttf"), fontWeight: 500 },
    ],
  });
  // Long URLs and keywords: break anywhere rather than overflow the page.
  Font.registerHyphenationCallback((word) => (word.length > 24 ? word.split("") : [word]));
}
