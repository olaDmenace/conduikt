// Pre-launch data reset. Equivalent to data-reset.sql but runnable via supabase-js
// admin client (bypasses RLS with service role key).
//
// Run:
//   node --env-file=.env.local scripts/cleanup/data-reset.mjs --dry-run
//   node --env-file=.env.local scripts/cleanup/data-reset.mjs
//
// What this does:
//   1. Delete all referral_earnings, referral_payouts, referral_conversions, referral_clicks
//   2. Clear profiles.referred_via + referred_at on every profile
//   3. Zero profiles.generation_count, reset generation_reset_at
//   4. Delete all ai_generations
//
// What it does NOT touch: referral_links, profiles.plan, payment ids, projects,
// campaigns, audits, assets, auth.users.

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function deleteAll(table) {
  // supabase-js requires a filter on delete; .not('id','is',null) targets every row.
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) throw new Error(`delete ${table}: ${error.message}`);
  return count ?? 0;
}

const tablesToClear = [
  "referral_earnings",
  "referral_payouts",
  "referral_conversions",
  "referral_clicks",
  "ai_generations",
];

console.log("\n--- Before ---");
const before = {};
for (const t of tablesToClear) {
  before[t] = await countRows(t);
  console.log(`  ${t}: ${before[t]} rows`);
}

const profilesWithReferral = await supabase
  .from("profiles")
  .select("*", { count: "exact", head: true })
  .not("referred_via", "is", null);
const referralCount = profilesWithReferral.count ?? 0;
console.log(`  profiles.referred_via set: ${referralCount}`);

const profilesTotal = await countRows("profiles");
console.log(`  profiles total: ${profilesTotal}`);

if (DRY_RUN) {
  console.log("\n[dry-run] no changes written. Re-run without --dry-run to commit.");
  process.exit(0);
}

console.log("\n--- Deleting ---");
for (const t of tablesToClear) {
  const n = await deleteAll(t);
  console.log(`  ${t}: deleted ${n}`);
}

console.log("\n--- Clearing profile referral attribution ---");
{
  const { error, count } = await supabase
    .from("profiles")
    .update(
      { referred_via: null, referred_at: null },
      { count: "exact" }
    )
    .not("referred_via", "is", null);
  if (error) throw new Error(`clear referred_via: ${error.message}`);
  console.log(`  profiles updated: ${count ?? 0}`);
}

console.log("\n--- Resetting generation counters on all profiles ---");
{
  const { error, count } = await supabase
    .from("profiles")
    .update(
      { generation_count: 0, generation_reset_at: new Date().toISOString() },
      { count: "exact" }
    )
    .not("id", "is", null);
  if (error) throw new Error(`reset generation_count: ${error.message}`);
  console.log(`  profiles updated: ${count ?? 0}`);
}

console.log("\n--- After ---");
for (const t of tablesToClear) {
  const n = await countRows(t);
  console.log(`  ${t}: ${n} rows`);
}
console.log("\nDone.");
