import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge can't tell our custom type-role classes (text-label,
// text-display-xl, …) from colour classes (text-text-3, text-on-photo, …):
// both look like `text-<word>`, so it treated them as conflicts and dropped
// the type class. Register the type roles as font sizes so a type class
// and a colour class can sit on the same element. Keep this list in sync
// with the TYPE SCALE section of src/styles/globals.css.
const TYPE_ROLES = [
  "display-xl",
  "display-l",
  "display-m",
  "display-s",
  "heading",
  "title",
  "body",
  "body-s",
  "caption",
  "label",
  // legacy roles, still used by unconverted pages
  "hero",
  "h1",
  "h2",
  "h3",
  "small",
  "data",
];

const twMerge = extendTailwindMerge<"type-numeric">({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPE_ROLES }],
      // text-numeric sets family + tabular figures, not a size, so it can
      // sit beside an explicit size like text-[2.75rem].
      "type-numeric": ["text-numeric"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
