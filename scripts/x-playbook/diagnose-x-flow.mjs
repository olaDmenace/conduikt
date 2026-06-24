#!/usr/bin/env node
// Forensics: where did the last X OAuth attempt land?

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log("=== ALL X rows in connected_accounts (regardless of user) ===\n");
const { data: xRows } = await db
  .from("connected_accounts")
  .select("id, user_id, platform_username, platform_user_id, token_expires_at, created_at, updated_at, scope")
  .eq("platform", "x")
  .order("updated_at", { ascending: false });

for (const r of xRows ?? []) {
  console.log(`  row.id:             ${r.id}`);
  console.log(`  user_id:            ${r.user_id}`);
  console.log(`  platform_username:  ${r.platform_username}`);
  console.log(`  platform_user_id:   ${r.platform_user_id}`);
  console.log(`  token_expires_at:   ${r.token_expires_at}`);
  console.log(`  scope:              ${r.scope ?? "(null)"}`);
  console.log(`  created_at:         ${r.created_at}`);
  console.log(`  updated_at:         ${r.updated_at}  ← most recent activity`);
  console.log("");
}

console.log("=== ALL LinkedIn rows in connected_accounts ===\n");
const { data: liRows } = await db
  .from("connected_accounts")
  .select("id, user_id, platform_username, token_expires_at, updated_at")
  .eq("platform", "linkedin")
  .order("updated_at", { ascending: false });

for (const r of liRows ?? []) {
  console.log(`  user_id=${r.user_id}  username=${r.platform_username}  updated=${r.updated_at}`);
}

console.log("\n=== Map of which user is which ===");
const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
const seenIds = new Set([
  ...(xRows ?? []).map((r) => r.user_id),
  ...(liRows ?? []).map((r) => r.user_id),
]);
for (const id of seenIds) {
  const u = users.find((x) => x.id === id);
  console.log(`  ${id} → ${u?.email ?? "?"} (last sign-in: ${u?.last_sign_in_at ?? "never"})`);
}
