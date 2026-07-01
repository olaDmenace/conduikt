#!/usr/bin/env node
// End-to-end smoke test for X media upload. Calls uploadXMedia() with the
// calibration clip URL — should return { ok: true, mediaId: "..." }.
//
// This verifies:
//   1. OAuth 2.0 bearer token still works (v2 single-shot)
//   2. ffmpeg binary is reachable (no — that's only on recording side)
//   3. (If >5 MB) OAuth 1.0a signing produces a valid signature X accepts
//
// PitchOdds clips are all <5 MB, so this hits the v2 single-shot path —
// the easy one. The OAuth 1.0a path stays untested until a bigger file
// shows up.
//
// Run:
//   node --env-file=.env.local --experimental-strip-types scripts/x-playbook/test-x-upload.mjs

import { createClient } from "@supabase/supabase-js";
import { uploadXMedia } from "../../src/lib/integrations/media-upload.ts";
import { ensureValidXToken } from "../../src/lib/integrations/x-token.ts";

const CLIP_URL =
  "https://yybpacultmaxqxjfsrvx.supabase.co/storage/v1/object/public/social-media-clips/clip-pitchodds-calibration.mp4";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Find @olaDmenace's connected X account.
const { data: account, error } = await db
  .from("connected_accounts")
  .select("id, user_id, access_token, refresh_token, token_expires_at, platform_username")
  .eq("platform", "x")
  .eq("user_id", "e2bb2edd-6d6c-4288-a386-145151c264ba")
  .maybeSingle();

if (error || !account) {
  console.error("No X account found:", error?.message);
  process.exit(1);
}

console.log(`X account: @${account.platform_username}  (user ${account.user_id})`);

const token = await ensureValidXToken(account);
if (!token) {
  console.error("Token refresh failed — reconnect X in /admin/settings/integrations");
  process.exit(1);
}
console.log("OAuth 2.0 bearer token: valid");

console.log("\nUploading calibration clip via uploadXMedia()…");
const media = {
  source: "upload",
  kind: "video",
  url: CLIP_URL,
  mimeType: "video/mp4",
  thumb: null,
};

const result = await uploadXMedia(token, media);

if (result.ok) {
  console.log(`\n✓ SUCCESS  media_id=${result.mediaId}`);
  console.log("v2 single-shot upload path works. Day 3 thread will fire video on Sat.");
} else {
  console.error(`\n✗ FAILED: ${result.error}`);
  console.error("\nDiagnose:");
  console.error("- If error mentions 401/403, the OAuth 2.0 token might lack media.write scope");
  console.error("- If error mentions 'media_category' or 'unsupported', try inspecting the clip file");
  console.error("- If error mentions OAuth 1.0a (the >5MB path), the clip is unexpectedly large");
}
