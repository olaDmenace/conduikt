#!/usr/bin/env node
// Applies the social-media-clips storage bucket migration via service role.
// Run with: node --env-file=.env.local scripts/x-playbook/apply-storage-migration.mjs

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "social-media-clips";

// Storage buckets have their own API — easier than running raw SQL.
const { data: existing } = await db.storage.getBucket(BUCKET);

if (existing) {
  console.log(`bucket "${BUCKET}" already exists. Updating settings...`);
  const { error } = await db.storage.updateBucket(BUCKET, {
    public: true,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ["video/mp4", "video/webm", "image/png", "image/jpeg"],
  });
  if (error) {
    console.error("updateBucket failed:", error.message);
    process.exit(1);
  }
  console.log("✓ bucket updated");
} else {
  const { error } = await db.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ["video/mp4", "video/webm", "image/png", "image/jpeg"],
  });
  if (error) {
    console.error("createBucket failed:", error.message);
    process.exit(1);
  }
  console.log(`✓ created bucket "${BUCKET}"`);
}

console.log(`\nbucket URL pattern: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/<filename>`);
