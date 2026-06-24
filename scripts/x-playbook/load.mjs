#!/usr/bin/env node
// 90-day X playbook loader.
// Run with:
//   node --env-file=.env.local scripts/x-playbook/load.mjs
//
// Required env (in .env.local or passed inline):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (already there)
//   PROJECT_ID    — Conduikt project that owns these posts
//   START_DATE    — Day 1 in YYYY-MM-DD (e.g. 2026-06-29)
//
// Optional env:
//   DRY_RUN=false   default true — only prints what it would do
//   KIND=evergreen  evergreen|bracket|all — what to load (default evergreen)
//   ONLY_DAYS=1,2   restrict to specific days (csv)
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
const START_DATE = process.env.START_DATE;
const KIND = process.env.KIND ?? "evergreen";
const DRY_RUN = process.env.DRY_RUN !== "false";
const ONLY_DAYS = process.env.ONLY_DAYS
  ? new Set(process.env.ONLY_DAYS.split(",").map((d) => parseInt(d.trim(), 10)))
  : null;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error("Missing PROJECT_ID env. Run preflight to find it.");
  process.exit(1);
}
if (!START_DATE || !/^\d{4}-\d{2}-\d{2}$/.test(START_DATE)) {
  console.error("Missing or invalid START_DATE env (expected YYYY-MM-DD).");
  process.exit(1);
}
if (!["evergreen", "bracket", "all"].includes(KIND)) {
  console.error(`Invalid KIND env: ${KIND}. Expected evergreen|bracket|all.`);
  process.exit(1);
}

// WAT (UTC+1) → UTC:  A 08:30 WAT = 07:30Z, B 13:00 = 12:00Z, C 18:30 = 17:30Z
const SLOT_UTC = { A: "07:30", B: "12:00", C: "17:30" };

const playbookPath = path.join(__dirname, "playbook.json");
const playbook = JSON.parse(fs.readFileSync(playbookPath, "utf8"));

const filtered = playbook
  .filter((p) => (KIND === "all" ? true : p.kind === KIND))
  .filter((p) => (ONLY_DAYS ? ONLY_DAYS.has(p.day) : true));

console.log("=== X Playbook Loader ===");
console.log(`mode:        ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`project_id:  ${PROJECT_ID}`);
console.log(`start_date:  ${START_DATE}`);
console.log(`kind filter: ${KIND}`);
if (ONLY_DAYS) console.log(`only days:   ${[...ONLY_DAYS].join(",")}`);
console.log(`posts:       ${filtered.length} of ${playbook.length} in playbook`);
console.log("");

const db = createClient(url, key, { auth: { persistSession: false } });

const summary = { queued: 0, skipped_exists: 0, skipped_past: 0, skipped_bracket_template: 0, errors: 0 };
const warnings = [];

for (const p of filtered) {
  // Compute scheduled_for in UTC. Day N = START_DATE + (N-1) days at SLOT_UTC[slot].
  const baseDate = new Date(`${START_DATE}T${SLOT_UTC[p.slot]}:00Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + (p.day - 1));

  if (Number.isNaN(baseDate.getTime())) {
    console.error(`invalid date for ${p.ref}`);
    summary.errors++;
    continue;
  }

  const label = `d${p.day}/${p.slot} ${p.kind.padEnd(9)} ${p.ref}`;

  if (baseDate.getTime() < Date.now()) {
    console.log(`  SKIP past:    ${label} (would be at ${baseDate.toISOString()})`);
    summary.skipped_past++;
    continue;
  }

  // Bracket posts still containing {...} placeholders won't be inserted by the
  // main loader — the daily bracket-filler script substitutes and inserts.
  // We skip them here loudly so the operator notices if KIND=all|bracket was used by accident.
  if (p.kind === "bracket" && /\{[A-Z_]+\}/.test(p.text)) {
    console.log(`  SKIP tmpl:    ${label} (bracket template — handled by daily filler)`);
    summary.skipped_bracket_template++;
    continue;
  }

  // Idempotency — skip if an asset with this ref already exists.
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
    console.log(`  SKIP exists:  ${label} (asset.id=${existing.id})`);
    summary.skipped_exists++;
    continue;
  }

  // Length sanity for SINGLE posts (threads handle themselves via splitForX).
  if (p.type === "single" && p.text.length > 270) {
    warnings.push(
      `${p.ref}: single post is ${p.text.length} chars — will be auto-threaded by splitForX.`
    );
  }

  console.log(
    `  QUEUE:        ${label} at ${baseDate.toISOString()} (${p.type}, ${p.text.length} chars)`
  );

  if (DRY_RUN) {
    summary.queued++;
    continue;
  }

  // Insert asset
  const { data: asset, error: aerr } = await db
    .from("assets")
    .insert({
      project_id: PROJECT_ID,
      type: "social_post",
      channel: "x",
      title: `X ${p.ref}`,
      status: "approved",
      content: {
        scheduled_text: p.text,
        ref: p.ref,
        pillar: p.pillar,
        kind: p.kind,
        ...(p.pin ? { pin: true } : {}),
        ...(p.media ? { media: p.media } : {}),
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
    channel: "x",
    scheduled_for: baseDate.toISOString(),
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
console.log(`queued:              ${summary.queued}`);
console.log(`skipped (exists):    ${summary.skipped_exists}`);
console.log(`skipped (past):      ${summary.skipped_past}`);
console.log(`skipped (template):  ${summary.skipped_bracket_template}`);
console.log(`errors:              ${summary.errors}`);

if (warnings.length) {
  console.log("\n=== Warnings ===");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (DRY_RUN) {
  console.log("\nDRY RUN — no writes performed. Re-run with DRY_RUN=false to apply.");
}
