// Generates a 1024x1024 PNG app icon for the Facebook Developer dashboard.
// Matches the existing Conduikt brand mark in /public/icon-512.png and the
// marketing nav: rounded copper square with a dark sans-serif "C", sitting
// on an obsidian backdrop (the corner fill).
//
// Run: node scripts/generate-app-icon.mjs

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/app-icon-1024.png");
mkdirSync(dirname(outPath), { recursive: true });

const SIZE = 1024;
const RADIUS = 224; // ~22% — Apple/iOS "squircle" feel

// Mineral palette
const COPPER_LIGHT = "#E0A372";
const COPPER = "#D4945A";
const COPPER_DEEP = "#C88550";
const OBSIDIAN = "#141210"; // surface-0 — backdrop behind the rounded tile

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="copper" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COPPER_LIGHT}" />
      <stop offset="50%" stop-color="${COPPER}" />
      <stop offset="100%" stop-color="${COPPER_DEEP}" />
    </linearGradient>
  </defs>

  <!-- Rounded copper tile — corners outside the rx/ry stay transparent -->
  <rect
    x="0"
    y="0"
    width="${SIZE}"
    height="${SIZE}"
    rx="${RADIUS}"
    ry="${RADIUS}"
    fill="url(#copper)"
  />

  <!-- Bold sans-serif "C" centered. Weight 700 matches icon-512. -->
  <text
    x="512"
    y="548"
    font-family="'Outfit', 'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="720"
    font-weight="700"
    fill="${OBSIDIAN}"
    text-anchor="middle"
    dominant-baseline="middle"
  >C</text>
</svg>
`;

// Keep the alpha channel so the rounded corners are transparent.
await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
  .toFile(outPath);

console.log(`[app-icon] wrote ${outPath}`);
