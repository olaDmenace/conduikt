// Regenerates public/og-image.png — the social-share preview that shows up
// when conduikt.com is linked on Twitter/LinkedIn/Slack/etc.
//
// Output: 1200x630 PNG (the OpenGraph canonical size).
// Source: public/conduikt-horizontal.png (the new brand mark).
//
// Fonts: fetches DM Serif Display, Outfit, and JetBrains Mono from Google
// Fonts at runtime, base64-embeds them into the SVG via @font-face. This
// makes the rendered text use the actual brand fonts rather than the
// system serif/sans fallbacks. Requires internet access at script time.
// If a font fetch fails, falls back to a generic family of the same kind.
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

// ---------------------------------------------------------------------------
// Google Fonts → base64 data URIs
// ---------------------------------------------------------------------------
// Modern-browser User-Agent so the CSS API returns WOFF2 (not the legacy
// TTF). The latin subset is sufficient for the headline + tagline + URL.
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchFontDataUri(family, weight = 400) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}&display=swap`;
  try {
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": CHROME_UA },
    });
    if (!cssRes.ok) throw new Error(`css fetch ${cssRes.status}`);
    const css = await cssRes.text();
    // Pull the first url(...) inside the latin @font-face. Google returns
    // multiple subsets; we only need latin for an OG image.
    const latinBlock = css.split("/* latin */")[1]?.split("/*")[0] ?? css;
    const match = latinBlock.match(
      /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/
    );
    if (!match) throw new Error("no latin woff2 url found");
    const woff2Url = match[1];

    const fontRes = await fetch(woff2Url);
    if (!fontRes.ok) throw new Error(`font fetch ${fontRes.status}`);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    return `data:font/woff2;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.warn(
      `[og-image] font fetch failed for ${family} ${weight}: ${err.message}. Falling back to system font.`
    );
    return null;
  }
}

console.log(`[og-image] generating ${W}x${H} from ${LOGO_SRC}`);
console.log(`[og-image] fetching brand fonts from Google Fonts...`);

const [dmSerifUri, outfitUri, jetbrainsUri] = await Promise.all([
  fetchFontDataUri("DM Serif Display", 400),
  fetchFontDataUri("Outfit", 400),
  fetchFontDataUri("JetBrains Mono", 500),
]);

// ---------------------------------------------------------------------------
// Logo composite layer
// ---------------------------------------------------------------------------
const logoBuffer = await sharp(LOGO_SRC)
  .resize({ height: 88, withoutEnlargement: false })
  .png()
  .toBuffer();
const logoMeta = await sharp(logoBuffer).metadata();
const logoW = logoMeta.width ?? 220;
const logoH = logoMeta.height ?? 88;

// ---------------------------------------------------------------------------
// SVG text layer with embedded fonts
// ---------------------------------------------------------------------------
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

const fontFaceDecls = [
  dmSerifUri
    ? `@font-face { font-family: 'DM Serif Display'; font-weight: 400; src: url('${dmSerifUri}') format('woff2'); }`
    : "",
  outfitUri
    ? `@font-face { font-family: 'Outfit'; font-weight: 400; src: url('${outfitUri}') format('woff2'); }`
    : "",
  jetbrainsUri
    ? `@font-face { font-family: 'JetBrains Mono'; font-weight: 500; src: url('${jetbrainsUri}') format('woff2'); }`
    : "",
]
  .filter(Boolean)
  .join("\n");

const textSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>
      ${fontFaceDecls}
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
        font-family: 'Outfit', 'Helvetica Neue', 'Arial', sans-serif;
        font-size: 28px;
        font-weight: 400;
        fill: ${TEXT_SECONDARY};
      }
      .url {
        font-family: 'JetBrains Mono', 'Menlo', 'Courier New', monospace;
        font-size: 20px;
        font-weight: 500;
        fill: ${TEXT_SECONDARY};
        letter-spacing: 1px;
      }
    </style>
  </defs>
  <text x="${PADDING_X}" y="${TITLE_TOP}" class="title">${titleLine1}</text>
  <text x="${PADDING_X}" y="${TITLE_TOP + 88}" class="title-accent">${titleLine2}</text>
  <text x="${PADDING_X}" y="${TAGLINE_TOP}" class="tagline">${tagline}</text>
  <text x="${PADDING_X}" y="${URL_TOP}" class="url">${url}</text>
</svg>
`;

// ---------------------------------------------------------------------------
// Composite: dark background → logo → text
// ---------------------------------------------------------------------------
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
console.log(
  `[og-image] fonts embedded: ${
    [
      dmSerifUri && "DM Serif Display",
      outfitUri && "Outfit",
      jetbrainsUri && "JetBrains Mono",
    ]
      .filter(Boolean)
      .join(", ") || "none (system fallback)"
  }`
);
const outMeta = await sharp(readFileSync(OUT)).metadata();
console.log(`[og-image] verified: ${outMeta.width}x${outMeta.height}`);
