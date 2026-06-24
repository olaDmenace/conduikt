#!/usr/bin/env node
// Uploads recorded MP4 clips to the social-media-clips Supabase Storage bucket
// and patches matching assets so the X publish cron can attach them.
//
// Run with:
//   node --env-file=.env.local scripts/x-playbook/upload-clips.mjs
//
// Looks in ~/Desktop/projects/_media/clips/*.mp4. For each clip:
//   1. Upload to social-media-clips bucket (public URL)
//   2. Find every asset whose content.media.ref matches the clip's basename
//      OR an alias in REF_ALIASES below
//   3. Patch content.media with source='upload' + url='<public url>' so
//      hasMedia() returns true and publishToX attaches the video.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "social-media-clips";
const CLIPS_DIR = process.env.CLIPS_DIR ?? path.join(os.homedir(), "Desktop", "projects", "_media", "clips");
const DRY_RUN = process.env.DRY_RUN === "true";

// Maps each spec-named clip to legacy refs that should also point at it.
// When a clip uploads, both its own ref AND every alias get patched.
const REF_ALIASES = {
  "clip-pitchodds-match": ["clip-1-pitchodds-walkthrough"],
  "clip-pitchodds-calibration": ["clip-2-calibration"],
  "clip-onboarding": ["clip-4-conduikt-url-to-plan", "clip-5-conduikt-content"],
  // pitchodds-mix and pitchodds-bracket have no legacy aliases — they're new.
};

if (!fs.existsSync(CLIPS_DIR)) {
  console.error(`Clips directory not found: ${CLIPS_DIR}`);
  console.error("Run the recorders first (record-pitchodds.ts, record-onboarding.ts).");
  process.exit(1);
}

const mp4s = fs.readdirSync(CLIPS_DIR).filter((f) => f.endsWith(".mp4"));
if (mp4s.length === 0) {
  console.error(`No .mp4 files in ${CLIPS_DIR}`);
  process.exit(1);
}

console.log(`Mode:       ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
console.log(`Clips dir:  ${CLIPS_DIR}`);
console.log(`MP4s found: ${mp4s.length}\n`);

const summary = { uploaded: 0, upload_failed: 0, patched: 0, patch_failed: 0, no_match: 0 };

for (const filename of mp4s) {
  const fullPath = path.join(CLIPS_DIR, filename);
  const ref = filename.replace(/\.mp4$/, "");
  const aliasRefs = REF_ALIASES[ref] ?? [];
  const allRefs = [ref, ...aliasRefs];
  const sizeMb = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);

  console.log(`▶ ${filename} (${sizeMb} MB) → ref="${ref}"${aliasRefs.length ? `, aliases=[${aliasRefs.join(", ")}]` : ""}`);

  let publicUrl;
  if (DRY_RUN) {
    publicUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]}/storage/v1/object/public/${BUCKET}/${filename}`;
    console.log(`  [dry] would upload → ${publicUrl}`);
  } else {
    const buffer = fs.readFileSync(fullPath);
    const { error: upErr } = await db.storage.from(BUCKET).upload(filename, buffer, {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "3600",
    });
    if (upErr) {
      console.error(`  ✗ upload failed: ${upErr.message}`);
      summary.upload_failed++;
      continue;
    }
    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(filename);
    publicUrl = urlData.publicUrl;
    console.log(`  ✓ uploaded → ${publicUrl}`);
    summary.uploaded++;
  }

  // Patch matching assets — any asset whose content.media.ref is in allRefs.
  // Service-role read so RLS doesn't filter.
  const { data: matches, error: matchErr } = await db
    .from("assets")
    .select("id, content")
    .in("content->media->>ref", allRefs);

  if (matchErr) {
    console.error(`  ✗ asset lookup failed: ${matchErr.message}`);
    summary.patch_failed++;
    continue;
  }

  if (!matches || matches.length === 0) {
    console.log(`  - no assets reference this clip yet (skipping patch)`);
    summary.no_match++;
    continue;
  }

  for (const asset of matches) {
    const existingMedia = asset.content?.media ?? {};
    const newMedia = {
      ...existingMedia,
      kind: "video",
      source: "upload",
      url: publicUrl,
      mimeType: "video/mp4",
    };
    if (DRY_RUN) {
      console.log(`  [dry] would patch asset ${asset.id} (ref was ${existingMedia.ref})`);
      summary.patched++;
      continue;
    }
    const { error: upErr } = await db
      .from("assets")
      .update({
        content: { ...asset.content, media: newMedia },
      })
      .eq("id", asset.id);
    if (upErr) {
      console.error(`  ✗ patch failed for asset ${asset.id}: ${upErr.message}`);
      summary.patch_failed++;
    } else {
      console.log(`  ✓ patched asset ${asset.id} (was ref=${existingMedia.ref})`);
      summary.patched++;
    }
  }
}

console.log(`\n=== Summary ===`);
console.log(`uploaded:      ${summary.uploaded}`);
console.log(`upload failed: ${summary.upload_failed}`);
console.log(`patched:       ${summary.patched}`);
console.log(`patch failed:  ${summary.patch_failed}`);
console.log(`no-match clip: ${summary.no_match}`);
if (DRY_RUN) console.log(`\nDRY RUN — re-run without DRY_RUN=true to apply.`);
