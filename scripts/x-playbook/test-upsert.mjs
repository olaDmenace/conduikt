#!/usr/bin/env node
// Repro the X callback's upsert and surface any silent error.
// Uses fake token values; we'll DELETE the test row before exiting.

import { createClient } from "@supabase/supabase-js";

const USER_ID = "e2bb2edd-6d6c-4288-a386-145151c264ba"; // account A
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log("Attempting upsert that mimics the X callback...\n");

// Same shape as src/app/api/integrations/x/callback/route.ts:69-81
const { data, error } = await db
  .from("connected_accounts")
  .upsert(
    {
      user_id: USER_ID,
      platform: "x",
      access_token: "fake_encrypted_access_token_for_test_only",
      refresh_token: "fake_encrypted_refresh_token_for_test_only",
      token_expires_at: new Date(Date.now() + 7200 * 1000).toISOString(),
      platform_user_id: "test_platform_user_id",
      platform_username: "test_olayinkafag",
      scope: "tweet.read tweet.write users.read offline.access",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  )
  .select();

if (error) {
  console.error("UPSERT ERROR (this is what the callback silently swallows):");
  console.error("  code:    ", error.code);
  console.error("  message: ", error.message);
  console.error("  details: ", error.details);
  console.error("  hint:    ", error.hint);
  process.exit(1);
}

console.log("Upsert SUCCEEDED. Inserted/updated row:");
console.log(JSON.stringify(data, null, 2));

// Clean up the test row so we don't leave fake credentials
const { error: derr } = await db
  .from("connected_accounts")
  .delete()
  .eq("user_id", USER_ID)
  .eq("platform", "x")
  .eq("platform_username", "test_olayinkafag");

if (derr) console.error("cleanup delete failed:", derr.message);
else console.log("\nTest row deleted. Clean state.");
