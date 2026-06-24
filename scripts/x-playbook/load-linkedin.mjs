#!/usr/bin/env node
// Loads the LinkedIn cross-post batch into Conduikt's scheduled_posts queue.
//
// Run with:
//   node --env-file=.env.local scripts/x-playbook/load-linkedin.mjs
//
// Required env:
//   PROJECT_ID — Conduikt project (same Personal Brand project used for X)
//
// Optional:
//   DRY_RUN=false   default true — only prints what it would do
//
// Idempotent: skips any post whose ref already exists as an asset.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.PROJECT_ID;
const DRY_RUN = process.env.DRY_RUN !== "false";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error("Missing PROJECT_ID env. Use the same Personal Brand project from preflight.");
  process.exit(1);
}

const playbook = JSON.parse(
  fs.readFileSync(path.join(__dirname, "linkedin-playbook.json"), "utf8")
);

console.log("=== LinkedIn Playbook Loader ===");
console.log(`mode:       ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`project_id: ${PROJECT_ID}`);
console.log(`posts:      ${playbook.length}`);
console.log("");

const db = createClient(url, key, { auth: { persistSession: false } });

const summary = { queued: 0, skipped_exists: 0, skipped_past: 0, errors: 0 };

for (const p of playbook) {
  const label = `d${p.day} ${p.ref}`;
  const scheduledFor = p.fireUtc;

  if (new Date(scheduledFor).getTime() < Date.now()) {
    console.log(`  SKIP past:   ${label} (${scheduledFor})`);
    summary.skipped_past++;
    continue;
  }

  // Idempotency — skip if asset with this ref already exists.
  const { data: existing, error: existsErr } = await db
    .from("assets")
    .select("id")
    .eq("content->>ref", p.ref)
    .maybeSingle();

  if (existsErr) {
    console.error(`  lookup failed for ${p.ref}:`, existsErr.message);
    summary.errors++;
    continue;
  }

  if (existing) {
    console.log(`  SKIP exists: ${label} (asset.id=${existing.id})`);
    summary.skipped_exists++;
    continue;
  }

  console.log(`  QUEUE:       ${label} → ${scheduledFor} (${p.text.length} chars)`);

  if (DRY_RUN) {
    summary.queued++;
    continue;
  }

  const { data: asset, error: aerr } = await db
    .from("assets")
    .insert({
      project_id: PROJECT_ID,
      type: "social_post",
      channel: "linkedin",
      title: p.title,
      status: "approved",
      content: {
        scheduled_text: p.text,
        ref: p.ref,
        pillar: "journey",
        kind: "evergreen",
      },
    })
    .select("id")
    .single();

  if (aerr || !asset) {
    console.error(`  asset insert failed for ${p.ref}:`, aerr?.message);
    summary.errors++;
    continue;
  }

  const { error: serr } = await db.from("scheduled_posts").insert({
    asset_id: asset.id,
    project_id: PROJECT_ID,
    channel: "linkedin",
    scheduled_for: scheduledFor,
    status: "pending",
  });

  if (serr) {
    console.error(`  scheduled_posts insert failed for ${p.ref}:`, serr.message);
    summary.errors++;
    continue;
  }

  summary.queued++;
}

console.log("\n=== Summary ===");
console.log(`queued:           ${summary.queued}`);
console.log(`skipped (exists): ${summary.skipped_exists}`);
console.log(`skipped (past):   ${summary.skipped_past}`);
console.log(`errors:           ${summary.errors}`);

if (DRY_RUN) {
  console.log("\nDRY RUN — no writes performed. Re-run with DRY_RUN=false to apply.");
}
