// Generates every favicon variant from public/conduikt-icon.png — the
// new brand mark (orange + teal intertwined "C"). Run after replacing
// the source file:
//   node scripts/generate-favicons.mjs
//
// Outputs (all into public/):
//   favicon.ico         single 32x32 PNG-embedded ICO (modern browsers)
//   favicon.png         32x32 main fallback
//   favicon-16x16.png   16x16 browser tab
//   favicon-32x32.png   32x32 browser tab (HiDPI)
//   apple-touch-icon.png 180x180 iOS home screen
//   icon-192.png        Android / PWA
//   icon-512.png        PWA splash + JSON-LD logo reference
//   app-icon-1024.png   Facebook / Meta dev dashboard

import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../public/conduikt-icon.png");
const OUT_DIR = resolve(__dirname, "../public");

const variants = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "favicon.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "app-icon-1024.png", size: 1024 },
];

console.log(`[favicons] source: ${SRC}`);

for (const { file, size } of variants) {
  const out = resolve(OUT_DIR, file);
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  console.log(`[favicons] wrote ${file} (${size}x${size})`);
}

// favicon.ico — write a single 32x32 PNG-content ICO. Modern browsers
// accept this; legacy IE doesn't matter for Conduikt's audience.
const icoPng = await sharp(SRC)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

const icoBuffer = Buffer.alloc(22 + icoPng.length);
// ICONDIR: reserved=0, type=1 (icon), count=1
icoBuffer.writeUInt16LE(0, 0);
icoBuffer.writeUInt16LE(1, 2);
icoBuffer.writeUInt16LE(1, 4);
// ICONDIRENTRY: 32x32, 0 colors, 0 reserved, 1 plane, 32 bpp, size, offset=22
icoBuffer.writeUInt8(32, 6);            // width
icoBuffer.writeUInt8(32, 7);            // height
icoBuffer.writeUInt8(0, 8);             // color count (0 = no palette)
icoBuffer.writeUInt8(0, 9);             // reserved
icoBuffer.writeUInt16LE(1, 10);         // color planes
icoBuffer.writeUInt16LE(32, 12);        // bits per pixel
icoBuffer.writeUInt32LE(icoPng.length, 14); // image size
icoBuffer.writeUInt32LE(22, 18);        // image offset
icoPng.copy(icoBuffer, 22);

writeFileSync(resolve(OUT_DIR, "favicon.ico"), icoBuffer);
console.log(`[favicons] wrote favicon.ico (32x32 PNG-embedded)`);

console.log(`\n[favicons] done. ${variants.length + 1} files written.`);
