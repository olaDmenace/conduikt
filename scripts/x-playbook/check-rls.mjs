#!/usr/bin/env node
// Inspect RLS policies on connected_accounts
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Use rpc to run a privileged query — fallback to manual fetch if no helper exists
const { data, error } = await db.rpc("exec_sql", {
  query: `SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'connected_accounts'`,
}).catch((e) => ({ data: null, error: e }));

if (error || !data) {
  // Fallback — try direct PostgREST view (won't work for pg_policies)
  console.log("rpc exec_sql not available; trying via PostgREST is not possible for pg_policies");
  console.log("error:", error?.message ?? error);
} else {
  console.log("policies:", JSON.stringify(data, null, 2));
}

// Most useful sanity test: try deleting a fake X row as if we were user A, see what RLS says
console.log("\n--- sanity: count of rows visible to service role per (platform, user_id) ---");
const { data: groups } = await db
  .from("connected_accounts")
  .select("platform, user_id");
const grouped = {};
for (const r of groups ?? []) {
  const k = `${r.platform}|${r.user_id}`;
  grouped[k] = (grouped[k] ?? 0) + 1;
}
for (const k of Object.keys(grouped).sort()) console.log(`  ${k} → ${grouped[k]}`);
