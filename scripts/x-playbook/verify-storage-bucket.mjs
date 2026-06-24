#!/usr/bin/env node
// Quick health check: upload a 1-byte ping file to the social-media-clips
// bucket, verify it's publicly accessible, then delete it.

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "social-media-clips";
const PING = "ping.png";

// 1x1 transparent PNG — a valid file the bucket's allowed_mime_types accepts.
const PNG_1x1 = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636060606000000005000124DD25060000000049454E44AE426082",
  "hex"
);

// 1. Confirm bucket exists.
const { data: bucket, error: bErr } = await db.storage.getBucket(BUCKET);
if (bErr || !bucket) {
  console.error(`✗ bucket "${BUCKET}" not found:`, bErr?.message);
  process.exit(1);
}
console.log(`✓ bucket exists  public=${bucket.public}  size_limit=${bucket.file_size_limit}`);

// 2. Upload the 67-byte test PNG.
const { error: upErr } = await db.storage
  .from(BUCKET)
  .upload(PING, PNG_1x1, { contentType: "image/png", upsert: true });
if (upErr) {
  console.error("✗ upload failed:", upErr.message);
  process.exit(1);
}
console.log("✓ test upload succeeded");

// 3. Get the public URL and fetch it.
const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(PING);
const publicUrl = urlData.publicUrl;
console.log(`  url: ${publicUrl}`);

const headRes = await fetch(publicUrl, { method: "GET" });
if (!headRes.ok) {
  console.error(`✗ public fetch failed: ${headRes.status} ${headRes.statusText}`);
  process.exit(1);
}
console.log(`✓ public read works  (${headRes.status}, content-length=${headRes.headers.get("content-length")})`);

// 4. Clean up.
const { error: dErr } = await db.storage.from(BUCKET).remove([PING]);
if (dErr) {
  console.error(`! cleanup failed: ${dErr.message}`);
} else {
  console.log("✓ test file deleted");
}

console.log("\nBucket is live and accessible.");
