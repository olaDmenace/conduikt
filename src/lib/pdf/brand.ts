// Single source of truth for PDF colors. Keeps every @react-pdf template
// aligned with the site-wide Mineral palette: teal-primary, copper-secondary,
// dark obsidian surfaces.
//
// Site-wide tokens live as CSS variables (see DESIGN_SYSTEM.md). They are
// duplicated here as resolved hex because @react-pdf can't read CSS vars
// at render time.
//
// PDFs always render dark — even when the dashboard is in light mode —
// because printed reports need consistency and the brand is most legible
// on obsidian.

export const PDF_BRAND = {
  // Surfaces — dark obsidian ladder.
  surface0: "#0C0C0E",
  surface1: "#141418",
  surface2: "#1C1C22",
  border: "#1C1C22",

  // Primary accent — brand teal. Used for headings, brand mark, section
  // titles, callouts. Replaces the prior copper-as-primary scheme.
  accent: "#2F8C85",
  accentDark: "#1F6B66",

  // Secondary accent — brand copper. Reserved for illustrative highlights,
  // chart series, conduikt-tool badges, and the marketing one-pager's
  // "secondary palette" demonstration. Never use copper for section
  // headings or primary CTAs.
  accentSecondary: "#D9663A",
  accentSecondaryDark: "#B24E27",

  // Cream — for warm highlight surfaces (subtle pull-quotes, etc.).
  cream: "#F4E2C9",

  // Text ladder.
  textPrimary: "#E8E4DE",
  textSecondary: "#9B958C",
  textTertiary: "#5E5A54",

  // Status colors — unchanged from prior PDFs.
  success: "#6B9E78",
  warning: "#C9A84C",
  error: "#B85C5C",
  info: "#6B8FAD",

  white: "#FFFFFF",
} as const;

export type PdfBrand = typeof PDF_BRAND;
