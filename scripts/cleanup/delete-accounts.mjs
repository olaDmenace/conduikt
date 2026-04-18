// Delete test accounts via Supabase Admin API.
//
// Run:
//   node --env-file=.env.local scripts/cleanup/delete-accounts.mjs
//   node --env-file=.env.local scripts/cleanup/delete-accounts.mjs --dry-run
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
// Deleting from auth.users cascades to profiles (ON DELETE CASCADE) and
// all user-owned tables that FK back to profiles/auth.users.

import { createClient } from "@supabase/supabase-js";

const EMAILS_TO_DELETE = [
  "nomakov581@tatefarm.com",
  "conduikt@yopmail.com",
  "qaretest1774786010439@sharebot.net",
  "ydzvmmqv@guerrillamailblock.com",
  "qa-retest-1774780811679@mailinator.com",
  "qa-fulltest-1774719159769@mailinator.com",
  "qa-test-1743098400@mailinator.com",
  "qa-test-1742319437@mailinator.com",
  "oladmenace@yopmail.com",
];

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

const wanted = new Set(EMAILS_TO_DELETE.map((e) => e.toLowerCase()));
const found = new Map(); // email → userId

let page = 1;
const perPage = 200;
while (wanted.size > found.size) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error(`listUsers page ${page} failed:`, error.message);
    process.exit(1);
  }
  if (!data.users.length) break;
  for (const u of data.users) {
    const email = (u.email ?? "").toLowerCase();
    if (wanted.has(email) && !found.has(email)) found.set(email, u.id);
  }
  if (data.users.length < perPage) break;
  page += 1;
}

const missing = EMAILS_TO_DELETE.filter((e) => !found.has(e.toLowerCase()));

console.log(`\nResolved ${found.size}/${EMAILS_TO_DELETE.length} accounts:`);
for (const [email, id] of found) console.log(`  ${email}  →  ${id}`);
if (missing.length) {
  console.log(`\nNot found (will skip):`);
  for (const email of missing) console.log(`  ${email}`);
}

if (DRY_RUN) {
  console.log("\n[dry-run] no accounts deleted. Re-run without --dry-run to commit.");
  process.exit(0);
}

console.log(`\nDeleting ${found.size} accounts...`);
let ok = 0;
let fail = 0;
for (const [email, id] of found) {
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    console.error(`  FAIL  ${email}: ${error.message}`);
    fail += 1;
  } else {
    console.log(`  OK    ${email}`);
    ok += 1;
  }
}

console.log(`\nDone. ${ok} deleted, ${fail} failed, ${missing.length} not found.`);
process.exit(fail > 0 ? 1 : 0);
