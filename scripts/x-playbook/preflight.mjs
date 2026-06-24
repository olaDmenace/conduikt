#!/usr/bin/env node
// Preflight for the 90-day X playbook loader.
// Verifies: env, connected X account, owning user, candidate projects.
// Read-only. Safe to run any time.

// Run with:  node --env-file=.env.local scripts/x-playbook/preflight.mjs
// (Node 24+ ships --env-file natively — no dotenv dependency.)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

console.log("=== X Playbook Preflight ===\n");

// 1. Connected X accounts
const { data: accts, error: aerr } = await db
  .from("connected_accounts")
  .select("id, user_id, platform_username, platform_user_id, token_expires_at, created_at, access_token, refresh_token")
  .eq("platform", "x")
  .order("created_at", { ascending: false });

if (aerr) {
  console.error("connected_accounts query failed:", aerr.message);
  process.exit(1);
}
if (!accts?.length) {
  console.error("No connected X account found. Connect @olayinkafag in Conduikt first (Settings → Connections).");
  process.exit(1);
}

console.log(`Connected X accounts: ${accts.length}`);
for (const a of accts) {
  console.log(
    `  - user_id=${a.user_id} username=@${a.platform_username ?? "?"} expires=${a.token_expires_at ?? "n/a"} ` +
    `access=${a.access_token ? "yes" : "NO"} refresh=${a.refresh_token ? "yes" : "no"}`
  );
}
const acct = accts[0];

// 2. Projects owned by that user
const { data: projs, error: perr } = await db
  .from("projects")
  .select("id, name, created_at, user_id")
  .eq("user_id", acct.user_id)
  .order("created_at", { ascending: false });

if (perr) {
  console.error("projects query failed:", perr.message);
  process.exit(1);
}

console.log(`\nProjects owned by user ${acct.user_id}: ${projs?.length ?? 0}`);
for (const p of projs ?? []) {
  console.log(`  - id=${p.id} name="${p.name}" created=${p.created_at}`);
}

// 3. Recent scheduled X posts (so we know the queue isn't already full)
const { data: pending, error: serr } = await db
  .from("scheduled_posts")
  .select("id, channel, status, scheduled_for")
  .eq("channel", "x")
  .eq("status", "pending")
  .order("scheduled_for", { ascending: true })
  .limit(20);

if (serr) {
  console.error("scheduled_posts query failed:", serr.message);
  process.exit(1);
}

console.log(`\nPending X scheduled_posts: ${pending?.length ?? 0}`);
for (const sp of pending ?? []) {
  console.log(`  - id=${sp.id} scheduled_for=${sp.scheduled_for}`);
}

console.log("\n=== Preflight complete ===");
console.log(`USER_ID  = ${acct.user_id}`);
console.log(`Pick a PROJECT_ID from the list above (or create one named "Personal Brand" if none fits).`);
