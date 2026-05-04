// Regenerates public/og-image.png — the social-share preview that shows up
// when conduikt.com is linked on Twitter/LinkedIn/Slack/etc.
//
// Output: 1200x630 PNG (the OpenGraph canonical size).
// Source: public/conduikt-horizontal.png (the new brand mark).
//
// Run after replacing brand assets:
//   node scripts/generate-og-image.mjs

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "../public");
const LOGO_SRC = resolve(PUBLIC, "conduikt-horizontal.png");
const OUT = resolve(PUBLIC, "og-image.png");

const W = 1200;
const H = 630;

// Brand surface (matches layout.tsx dark themeColor).
const BACKGROUND = "#0C0C0E";
const TEXT_PRIMARY = "#E8E4DE";   // mineral text-primary, never pure white
const TEXT_SECONDARY = "#A39C92"; // mineral text-secondary
const ACCENT = "#D4956A";         // copper accent (matches webmanifest theme_color)

console.log(`[og-image] generating ${W}x${H} from ${LOGO_SRC}`);

// 1. Resize the horizontal logo for OG scale (height 88px, width auto).
const logoBuffer = await sharp(LOGO_SRC)
  .resize({ height: 88, withoutEnlargement: false })
  .png()
  .toBuffer();
const logoMeta = await sharp(logoBuffer).metadata();
const logoW = logoMeta.width ?? 220;
const logoH = logoMeta.height ?? 88;

// 2. Build an SVG layer with title + tagline + url. Anchored to the same
//    left padding as the logo for a clean grid.
const PADDING_X = 80;
const LOGO_TOP = 140;
const TITLE_TOP = LOGO_TOP + logoH + 60;
const TAGLINE_TOP = TITLE_TOP + 110;
const URL_TOP = H - 80;

const titleLine1 = "AI Marketing Automation";
const titleLine2 = "for SaaS Founders";
const tagline =
  "Audit, generate, publish, and send — all from one dashboard.";
const url = "conduikt.com";

const textSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .title {
      font-family: 'DM Serif Display', 'Georgia', serif;
      font-size: 72px;
      font-weight: 400;
      fill: ${TEXT_PRIMARY};
    }
    .title-accent {
      font-family: 'DM Serif Display', 'Georgia', serif;
      font-size: 72px;
      font-weight: 400;
      fill: ${ACCENT};
    }
    .tagline {
      font-family: 'Outfit', 'Helvetica Neue', sans-serif;
      font-size: 28px;
      font-weight: 400;
      fill: ${TEXT_SECONDARY};
    }
    .url {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 20px;
      font-weight: 500;
      fill: ${TEXT_SECONDARY};
      letter-spacing: 1px;
    }
  </style>
  <text x="${PADDING_X}" y="${TITLE_TOP}" class="title">${titleLine1}</text>
  <text x="${PADDING_X}" y="${TITLE_TOP + 88}" class="title-accent">${titleLine2}</text>
  <text x="${PADDING_X}" y="${TAGLINE_TOP}" class="tagline">${tagline}</text>
  <text x="${PADDING_X}" y="${URL_TOP}" class="url">${url}</text>
</svg>
`;

// 3. Compose: solid background → logo at top-left → text overlay.
await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: BACKGROUND,
  },
})
  .composite([
    {
      input: logoBuffer,
      top: LOGO_TOP,
      left: PADDING_X,
    },
    {
      input: Buffer.from(textSvg),
      top: 0,
      left: 0,
    },
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(OUT);

console.log(`[og-image] wrote ${OUT}`);
console.log(`[og-image] logo: ${logoW}x${logoH}, full: ${W}x${H}`);
// Sanity-check the output dimensions before exiting.
const outMeta = await sharp(readFileSync(OUT)).metadata();
console.log(`[og-image] verified: ${outMeta.width}x${outMeta.height}`);
