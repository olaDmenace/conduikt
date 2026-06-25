#!/usr/bin/env node
// Look up a scheduled X post by its content.ref and report the full state:
// asset content, scheduled_posts status, error_message, posted_at, etc.
//
// Run:
//   node --env-file=.env.local scripts/x-playbook/check-post.mjs <ref>

import { createClient } from "@supabase/supabase-js";

const ref = process.argv[2];
if (!ref) {
  console.error("Usage: node scripts/x-playbook/check-post.mjs <ref>");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: asset, error: aerr } = await db
  .from("assets")
  .select("id, title, status, channel, content, created_at, updated_at")
  .eq("content->>ref", ref)
  .maybeSingle();

if (aerr) {
  console.error("asset lookup failed:", aerr.message);
  process.exit(1);
}
if (!asset) {
  console.error(`no asset for ref="${ref}"`);
  process.exit(1);
}

console.log(`=== asset ${asset.id} ===`);
console.log(`  title:     ${asset.title}`);
console.log(`  channel:   ${asset.channel}`);
console.log(`  status:    ${asset.status}`);
console.log(`  created:   ${asset.created_at}`);
console.log(`  updated:   ${asset.updated_at}`);
console.log(`  media:     ${JSON.stringify(asset.content?.media ?? null)}`);
console.log(`  text len:  ${asset.content?.scheduled_text?.length ?? 0} chars`);
console.log("");
console.log("  text preview (first 200 chars):");
console.log("    " + (asset.content?.scheduled_text ?? "").slice(0, 200).replace(/\n/g, "\n    "));

const { data: sched, error: serr } = await db
  .from("scheduled_posts")
  .select("id, status, scheduled_for, posted_at, error_message, external_post_id, created_at")
  .eq("asset_id", asset.id)
  .order("scheduled_for", { ascending: false });

if (serr) {
  console.error("scheduled_posts lookup failed:", serr.message);
  process.exit(1);
}

console.log(`\n=== scheduled_posts (${sched?.length ?? 0}) ===`);
for (const sp of sched ?? []) {
  console.log(`  id:                ${sp.id}`);
  console.log(`  status:            ${sp.status}`);
  console.log(`  scheduled_for:     ${sp.scheduled_for}`);
  console.log(`  posted_at:         ${sp.posted_at ?? "—"}`);
  console.log(`  external_post_id:  ${sp.external_post_id ?? "—"}`);
  console.log(`  error_message:     ${sp.error_message ?? "—"}`);
  console.log(`  created_at:        ${sp.created_at}`);
}
