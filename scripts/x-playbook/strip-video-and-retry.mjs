#!/usr/bin/env node
// Quick recovery for the X video upload issue: strip the video media hint
// from any asset that has it, then reset the linked scheduled_post(s) to
// 'pending' so the publish cron retries text-only on the next */5 run.
//
// Run:
//   node --env-file=.env.local scripts/x-playbook/strip-video-and-retry.mjs
//
// Targets every asset with content.media.kind = "video" that's linked to a
// scheduled_post in status='pending' or 'failed'. Idempotent.

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Find every X asset whose content.media.kind === "video"
const { data: assets, error: aerr } = await db
  .from("assets")
  .select("id, title, content")
  .eq("channel", "x")
  .eq("content->media->>kind", "video");

if (aerr) {
  console.error("asset query failed:", aerr.message);
  process.exit(1);
}

console.log(`Found ${assets?.length ?? 0} assets with video media hints.\n`);

let cleaned = 0;
let reset = 0;

for (const asset of assets ?? []) {
  // Find its scheduled_posts.
  const { data: scheds } = await db
    .from("scheduled_posts")
    .select("id, status, scheduled_for, error_message")
    .eq("asset_id", asset.id);

  const relevant = (scheds ?? []).filter(
    (s) => s.status === "pending" || s.status === "failed"
  );
  if (relevant.length === 0) {
    console.log(`  skip ${asset.id} — no pending/failed scheduled_posts`);
    continue;
  }

  console.log(`▶ ${asset.title}  (ref=${asset.content?.ref})`);

  // Strip the video media (keep the rest of content intact).
  const newContent = { ...asset.content };
  delete newContent.media;

  const { error: upErr } = await db
    .from("assets")
    .update({ content: newContent })
    .eq("id", asset.id);

  if (upErr) {
    console.error(`  ✗ strip failed: ${upErr.message}`);
    continue;
  }
  cleaned++;
  console.log(`  ✓ stripped video media`);

  // Reset each linked sched.
  for (const s of relevant) {
    const { error: rerr } = await db
      .from("scheduled_posts")
      .update({
        status: "pending",
        error_message: null,
      })
      .eq("id", s.id);
    if (rerr) {
      console.error(`  ✗ reset ${s.id} failed: ${rerr.message}`);
    } else {
      console.log(`  ✓ reset ${s.id} (was ${s.status}, scheduled_for ${s.scheduled_for})`);
      reset++;
    }
  }
}

console.log(`\n=== Summary ===`);
console.log(`assets cleaned:        ${cleaned}`);
console.log(`scheduled_posts reset: ${reset}`);
console.log(`\nCron runs */5 min. Next fire should pick up the retry within 5 min.`);
