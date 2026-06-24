// Films Conduikt's signup → login → onboarding wizard → audit-gauge flow.
//
// Auto-creates a unique test user via the Supabase admin API (email_confirm:
// true) BEFORE filming, then deletes it after. No manual test-user setup.
// The signup form fill is shown for the journey; the actual auth happens
// off-camera via the admin-created user (the filled signup is a visual).
//
// Run:
//   cd ~/Desktop/projects/conduikt
//   pnpm dev    # in another terminal — or set REC_BASE_URL to prod
//   npx tsx scripts/record-onboarding.ts
//
// Output (overwrites): ~/Desktop/projects/_media/clips/clip-onboarding.mp4

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BASE = process.env.REC_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.REC_OUT ?? path.join(os.homedir(), "Desktop", "projects", "_media", "clips");
const FFMPEG = ffmpegPath ?? "ffmpeg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Use --env-file=.env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const stamp = Date.now();
const TEST_EMAIL = `recorder-${stamp}@conduikt-test.local`;
const TEST_PASSWORD = `RecorderPass${stamp}!`;
const TEST_NAME = "Acme Coffee Recorder";

async function createTestUser(): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: TEST_NAME },
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? "unknown"}`);
  }
  console.log(`✓ created test user ${data.user.id} (${TEST_EMAIL})`);
  return data.user.id;
}

async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`! failed to delete test user ${userId}: ${error.message}`);
  } else {
    console.log(`✓ deleted test user ${userId}`);
  }
}

async function recordSession(): Promise<string> {
  const tmpDir = path.join(process.cwd(), ".rec-onboarding");
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const browser = await chromium.launch({ headless: true, slowMo: 450 });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
      recordVideo: { dir: tmpDir, size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();

    // 1. Signup form fill (no submit — the user is pre-confirmed via admin API).
    //    Selectors verified against src/app/(auth)/signup/page.tsx.
    await page.goto(`${BASE}/signup/`);
    await page.waitForTimeout(1500);

    await page.getByPlaceholder("Michael Doe").fill(TEST_NAME);
    await page.waitForTimeout(400);
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.waitForTimeout(400);
    await page.getByPlaceholder("Min 8 characters").fill(TEST_PASSWORD);
    await page.waitForTimeout(2000); // hold on the filled form

    // 2. Login — the user was pre-confirmed via admin API.
    await page.goto(`${BASE}/login/`);
    await page.waitForTimeout(800);
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Enter your password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL("**/dashboard/**", { timeout: 15_000 });
    await page.waitForTimeout(1500);

    // 3. Onboarding tour (auto-shows for new users) — click through.
    for (let i = 0; i < 5; i++) {
      const next = page.getByRole("button", { name: /^Next$/ });
      if (await next.isVisible().catch(() => false)) {
        await next.click();
        await page.waitForTimeout(700);
      } else break;
    }
    const getStarted = page.getByRole("button", { name: /Get Started/i });
    if (await getStarted.isVisible().catch(() => false)) {
      await getStarted.click();
      await page.waitForTimeout(800);
    }

    // 4. New-project wizard
    await page.goto(`${BASE}/projects/new/`);
    await page.waitForTimeout(1000);

    // Step 1 — url
    await page.getByPlaceholder("My SaaS Product").fill("Acme Coffee Co");
    await page.waitForTimeout(400);
    await page.getByPlaceholder("https://example.com").fill("https://example.com");
    await page.waitForTimeout(400);
    await page
      .getByPlaceholder("What does your product do?")
      .fill("Specialty coffee subscription for offices");
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^Next$/ }).click();

    // Step 2 — 6 questions, pick first option each
    for (let q = 0; q < 6; q++) {
      await page.waitForTimeout(600);
      // The 6-question setup uses non-nav buttons for options. Click the first
      // button inside the question card that's not Next/Back/Skip.
      const optionButtons = page.locator(
        'button[type="button"]:not(:has-text("Next")):not(:has-text("Back")):not(:has-text("Skip")):not(:has-text("Continue"))'
      );
      const first = optionButtons.first();
      if (await first.isVisible().catch(() => false)) {
        await first.click().catch(() => {});
      }
      await page.waitForTimeout(400);
      const cont = page.getByRole("button", { name: /Continue/i });
      const next = page.getByRole("button", { name: /^Next$/ });
      if (await cont.isVisible().catch(() => false)) {
        await cont.click();
        break;
      } else if (await next.isVisible().catch(() => false)) {
        await next.click();
      } else {
        break;
      }
    }

    // Step 3 — context
    await page.waitForTimeout(800);
    await page
      .getByPlaceholder(/Who is your ideal customer/i)
      .fill("Office managers at 20–200 person companies");
    await page.waitForTimeout(400);
    await page
      .getByPlaceholder(/What makes your product unique/i)
      .fill("Freshly roasted, delivered weekly, fully managed");
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /Create & Run Audit/i }).click();

    // 5. Hero — audit gauge. The wizard sometimes lands on /projects/[id]/ and
    //    sometimes on /projects/[id]/audit/ depending on the path through the
    //    wizard. Wait for any project page then explicitly navigate to /audit.
    await page.waitForURL(/\/projects\/[0-9a-f-]{8,}/, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    const projectMatch = page.url().match(/\/projects\/([0-9a-f-]{8,})/);
    if (projectMatch) {
      await page.goto(`${BASE}/projects/${projectMatch[1]}/audit/`);
      await page.waitForTimeout(5000); // let the score gauge animate + linger
    } else {
      await page.waitForTimeout(3000);
    }

    await ctx.close();
  } finally {
    await browser.close();
  }

  const webm = fs.readdirSync(tmpDir).find((f) => f.endsWith(".webm"));
  if (!webm) {
    throw new Error("no webm produced");
  }

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, "clip-onboarding.mp4");
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-i",
      path.join(tmpDir, webm),
      "-vf",
      "scale=1920:1080",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { stdio: "pipe" }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
  return outPath;
}

(async () => {
  console.log(`base url: ${BASE}`);
  console.log(`output:   ${OUT}\n`);

  const userId = await createTestUser();
  try {
    const outPath = await recordSession();
    const sizeMb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
    console.log(`\n✓ clip-onboarding.mp4 (${sizeMb} MB) → ${outPath}`);
  } finally {
    // Always clean up the test user, even if recording fails.
    await deleteTestUser(userId);
  }
})();
