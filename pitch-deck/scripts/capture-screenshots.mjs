#!/usr/bin/env node
// Captures the public conduikt.com marketing pages for the pitch deck's
// Product slide. Runs against the live production site.
//
// Usage:
//   cd pitch-deck
//   npm install        # ensures playwright-chromium is installed
//   npm run screenshots
//
// Output:
//   public/screenshots/homepage.png
//   public/screenshots/features.png
//   public/screenshots/pricing.png
//
// Authenticated screenshots (agent playground, SEO audit output, campaign
// builder) need to be added manually — the visa committee deck is small
// enough that taking those by hand once is faster than wiring up auth here.

import { chromium } from "playwright-chromium";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "screenshots");

const BASE = process.env.BASE_URL ?? "https://conduikt.com";

const CAPTURES = [
  { name: "homepage", path: "/", waitFor: "h1" },
  { name: "features", path: "/features", waitFor: "h1" },
  { name: "pricing", path: "/pricing", waitFor: "h1" },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();

  for (const cap of CAPTURES) {
    const url = `${BASE}${cap.path}`;
    process.stdout.write(`Capturing ${url} … `);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      if (cap.waitFor) {
        await page.waitForSelector(cap.waitFor, { timeout: 10_000 }).catch(() => {});
      }
      // Settle any entry animations.
      await page.waitForTimeout(1200);

      const outPath = path.join(OUT_DIR, `${cap.name}.png`);
      await page.screenshot({
        path: outPath,
        type: "png",
        fullPage: false,
        clip: { x: 0, y: 0, width: 1440, height: 900 },
      });
      const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(`✓ ${cap.name}.png (${sizeKB} KB)`);
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await browser.close();
  console.log(`\nScreenshots saved to ${OUT_DIR}`);
})();
