#!/usr/bin/env node
// Diagnose connection state for a specific user.
// Run with:  node --env-file=.env.local scripts/x-playbook/diagnose.mjs <email>

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/x-playbook/diagnose.mjs <email>");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// 1. Find the user in auth.users
const { data: { users }, error: uerr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (uerr) {
  console.error("auth list users failed:", uerr.message);
  process.exit(1);
}
const matches = users.filter((u) => u.email?.toLowerCase() === email.toLowerCase());

console.log(`=== Diagnose ${email} ===\n`);
console.log(`auth.users rows matching email: ${matches.length}`);
for (const u of matches) {
  console.log(`  id=${u.id}  email=${u.email}  created=${u.created_at}  last_sign_in=${u.last_sign_in_at}`);
}

if (matches.length === 0) {
  console.error("No auth user found with that email.");
  process.exit(1);
}

const userId = matches[0].id;

// 2. All connected_accounts rows for that user
const { data: accts, error: aerr } = await db
  .from("connected_accounts")
  .select("id, platform, platform_username, platform_user_id, token_expires_at, scope, created_at, updated_at, access_token, refresh_token")
  .eq("user_id", userId)
  .order("platform");

if (aerr) {
  console.error("connected_accounts query failed:", aerr.message);
  process.exit(1);
}

console.log(`\nconnected_accounts rows for user ${userId}: ${accts?.length ?? 0}`);
for (const a of accts ?? []) {
  console.log(`  ─ ${a.platform.toUpperCase()}`);
  console.log(`    id:                ${a.id}`);
  console.log(`    platform_username: ${a.platform_username ?? "(null)"}`);
  console.log(`    platform_user_id:  ${a.platform_user_id ?? "(null)"}`);
  console.log(`    token_expires_at:  ${a.token_expires_at ?? "(null)"}`);
  console.log(`    scope:             ${a.scope ?? "(null)"}`);
  console.log(`    access_token:      ${a.access_token ? `set (len=${a.access_token.length})` : "MISSING"}`);
  console.log(`    refresh_token:     ${a.refresh_token ? `set (len=${a.refresh_token.length})` : "MISSING"}`);
  console.log(`    created_at:        ${a.created_at}`);
  console.log(`    updated_at:        ${a.updated_at}`);
}

// 3. Check if there are OTHER users with rows that might be confusing the UI
const { data: otherAccts } = await db
  .from("connected_accounts")
  .select("user_id, platform, platform_username")
  .neq("user_id", userId);

console.log(`\nconnected_accounts rows OWNED BY OTHER USERS: ${otherAccts?.length ?? 0}`);
for (const a of otherAccts ?? []) {
  console.log(`  user_id=${a.user_id} platform=${a.platform} username=${a.platform_username}`);
}

// 4. Check RLS policy quickly
const { data: rlsCheck, error: rlsErr } = await db
  .from("connected_accounts")
  .select("count")
  .eq("user_id", userId)
  .limit(1);

console.log(`\nDirect service-role count of user's rows: ${rlsCheck?.length ? "rows present" : "no rows"} (err=${rlsErr?.message ?? "none"})`);
