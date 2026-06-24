#!/usr/bin/env node
// Deletes existing X playbook rows so a reload can re-create them with a new
// schedule. Idempotent: matches by content.ref against entries in playbook.json.
//
// Run with:
//   node --env-file=.env.local scripts/x-playbook/reset.mjs        (DRY-RUN)
//   DRY_RUN=false node --env-file=.env.local scripts/x-playbook/reset.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.env.DRY_RUN !== "false";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const playbook = JSON.parse(
  fs.readFileSync(path.join(__dirname, "playbook.json"), "utf8")
);
const refs = playbook.map((p) => p.ref);

console.log(`Looking for assets with refs in playbook.json (${refs.length} refs)…\n`);

// Find existing asset IDs by ref
const { data: assets, error: aerr } = await db
  .from("assets")
  .select("id, content")
  .in("content->>ref", refs);

if (aerr) {
  console.error("asset lookup failed:", aerr.message);
  process.exit(1);
}

console.log(`Found ${assets?.length ?? 0} existing assets to delete.`);
const assetIds = (assets ?? []).map((a) => a.id);

if (assetIds.length === 0) {
  console.log("Nothing to reset.");
  process.exit(0);
}

// Find scheduled_posts pointing at those assets
const { data: sched, error: serr } = await db
  .from("scheduled_posts")
  .select("id, scheduled_for, status, asset_id")
  .in("asset_id", assetIds);

if (serr) {
  console.error("scheduled_posts lookup failed:", serr.message);
  process.exit(1);
}

console.log(`Found ${sched?.length ?? 0} linked scheduled_posts rows.`);

if (DRY_RUN) {
  console.log("\nDRY RUN — would delete:");
  for (const sp of sched ?? []) {
    console.log(`  scheduled_posts.id=${sp.id} status=${sp.status} for=${sp.scheduled_for}`);
  }
  console.log(`  + ${assetIds.length} assets`);
  console.log("\nRe-run with DRY_RUN=false to apply.");
  process.exit(0);
}

// Refuse to delete any scheduled_posts that's already 'posted' — that means
// the cron published it for real and we should NOT remove the audit trail.
const alreadyPosted = (sched ?? []).filter((sp) => sp.status === "posted");
if (alreadyPosted.length > 0) {
  console.error(`REFUSING to reset — ${alreadyPosted.length} scheduled_post(s) have status='posted'.`);
  console.error("These represent real tweets that went out. Aborting.");
  for (const sp of alreadyPosted) console.error(`  posted: id=${sp.id}`);
  process.exit(1);
}

// Delete scheduled_posts first (FK constraint protects assets)
const { error: dsErr } = await db
  .from("scheduled_posts")
  .delete()
  .in("asset_id", assetIds);

if (dsErr) {
  console.error("scheduled_posts delete failed:", dsErr.message);
  process.exit(1);
}
console.log(`Deleted ${sched?.length ?? 0} scheduled_posts rows.`);

const { error: daErr } = await db
  .from("assets")
  .delete()
  .in("id", assetIds);

if (daErr) {
  console.error("assets delete failed:", daErr.message);
  process.exit(1);
}
console.log(`Deleted ${assetIds.length} assets rows.`);

console.log("\nReset complete. Re-run load.mjs with the new START_DATE.");
