#!/usr/bin/env node
// Confirm there are no duplicate (user_id, platform) rows before adding UNIQUE constraint.
import { createClient } from "@supabase/supabase-js";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await db.from("connected_accounts").select("user_id, platform");
if (error) { console.error(error.message); process.exit(1); }

const counts = new Map();
for (const r of data) {
  const k = `${r.user_id}|${r.platform}`;
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
const dupes = [...counts.entries()].filter(([_, n]) => n > 1);
console.log(`Total rows: ${data.length}`);
console.log(`Distinct (user_id, platform) pairs: ${counts.size}`);
console.log(`Duplicate pairs: ${dupes.length}`);
for (const [k, n] of dupes) console.log(`  ${k} → ${n} rows`);
process.exit(dupes.length > 0 ? 2 : 0);
