#!/usr/bin/env node
// Re-attaches a Supabase-hosted clip to a specific scheduled X asset.
// Used after strip-video-and-retry.mjs nuked all media hints during the
// OAuth 2.0 → 1.0a transition.
//
// Run:
//   node --env-file=.env.local scripts/x-playbook/reattach-clip.mjs <asset-ref> <clip-name>
//
// Example:
//   node ... scripts/x-playbook/reattach-clip.mjs d3-b-model-thread clip-pitchodds-match

import { createClient } from "@supabase/supabase-js";

const [, , assetRef, clipName] = process.argv;
if (!assetRef || !clipName) {
  console.error("Usage: node reattach-clip.mjs <asset-ref> <clip-name>");
  console.error("Example: node reattach-clip.mjs d3-b-model-thread clip-pitchodds-match");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "social-media-clips";
const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clipName}.mp4`;

// Verify the clip exists in storage by HEAD'ing the public URL.
const headRes = await fetch(url, { method: "HEAD" });
if (!headRes.ok) {
  console.error(`✗ Clip ${clipName}.mp4 not found at ${url}`);
  console.error(`  Upload it first: node scripts/x-playbook/upload-clips.mjs`);
  process.exit(1);
}
console.log(`✓ Clip exists: ${url} (${headRes.headers.get("content-length")} bytes)`);

// Find the asset.
const { data: asset, error: aerr } = await db
  .from("assets")
  .select("id, content, title")
  .eq("content->>ref", assetRef)
  .maybeSingle();

if (aerr || !asset) {
  console.error(`✗ No asset with ref="${assetRef}":`, aerr?.message ?? "not found");
  process.exit(1);
}

const newMedia = {
  source: "upload",
  kind: "video",
  url,
  ref: clipName,
  mimeType: "video/mp4",
  thumb: null,
};

console.log(`\nPatching asset ${asset.id} (${asset.title})…`);
console.log(`  media: ${JSON.stringify(newMedia)}`);

const { error: upErr } = await db
  .from("assets")
  .update({
    content: { ...asset.content, media: newMedia },
  })
  .eq("id", asset.id);

if (upErr) {
  console.error(`✗ patch failed: ${upErr.message}`);
  process.exit(1);
}

console.log(`✓ Asset patched. When the cron next fires this asset, the clip will attach via the OAuth 1.0a v1.1 chunked path.`);
