#!/usr/bin/env node
// Diagnoses why LinkedIn metrics aren't syncing for Personal Brand posts.
// Calls each candidate endpoint with proper URN encoding + decrypted token,
// reports raw status + body so we can pick the right fix.
//
// Run:
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json \
//     scripts/loop-closure/diagnose-linkedin-metrics.mjs

import { createServiceClient } from "../../src/lib/supabase/service";
import { ensureValidLinkedInToken } from "../../src/lib/integrations/linkedin-token";

const PERSONAL_BRAND = "22b2de3c-abf6-4b63-8989-be8da6500f78";

const db = createServiceClient();

const { data: account } = await db
  .from("connected_accounts")
  .select("id, user_id, access_token, refresh_token, token_expires_at, platform_username")
  .eq("user_id", "e2bb2edd-6d6c-4288-a386-145151c264ba")
  .eq("platform", "linkedin")
  .maybeSingle();

if (!account) {
  console.error("No LinkedIn account found.");
  process.exit(1);
}

const token = await ensureValidLinkedInToken(account);
if (!token) {
  console.error("Token refresh failed.");
  process.exit(1);
}

console.log(`LinkedIn account: ${account.platform_username}`);
console.log(`Token prefix: ${token.slice(0, 10)}…\n`);

const { data: posts } = await db
  .from("scheduled_posts")
  .select("id, external_post_id, posted_at")
  .eq("project_id", PERSONAL_BRAND)
  .eq("channel", "linkedin")
  .eq("status", "posted")
  .not("external_post_id", "is", null)
  .order("posted_at", { ascending: true });

if (!posts?.length) {
  console.error("No posted LinkedIn posts found.");
  process.exit(1);
}

const urn = posts[0].external_post_id;
const urnEncoded = encodeURIComponent(urn);

console.log(`Testing against URN: ${urn}`);
console.log(`URL-encoded: ${urnEncoded}\n`);

const endpoints = [
  // Original code path (BUG: raw URN with colons in URL)
  {
    name: "v2/socialActions/{urn} — raw URN (current code)",
    url: `https://api.linkedin.com/v2/socialActions/${urn}`,
    headers: { "X-Restli-Protocol-Version": "2.0.0" },
  },
  // Same path, URL-encoded URN
  {
    name: "v2/socialActions/{urn} — URL-encoded URN",
    url: `https://api.linkedin.com/v2/socialActions/${urnEncoded}`,
    headers: { "X-Restli-Protocol-Version": "2.0.0" },
  },
  // Try the rest variant
  {
    name: "rest/socialActions/{urn} — URL-encoded URN, LinkedIn-Version header",
    url: `https://api.linkedin.com/rest/socialActions/${urnEncoded}`,
    headers: {
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202506",
    },
  },
  // Posts API (modern)
  {
    name: "rest/posts/{urn} — Posts API",
    url: `https://api.linkedin.com/rest/posts/${urnEncoded}`,
    headers: {
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202506",
    },
  },
];

for (const ep of endpoints) {
  console.log(`--- ${ep.name}`);
  console.log(`GET ${ep.url}`);
  try {
    const res = await fetch(ep.url, {
      headers: { Authorization: `Bearer ${token}`, ...ep.headers },
    });
    const body = await res.text();
    console.log(`  status: ${res.status}`);
    console.log(`  body:   ${body.slice(0, 500)}`);
  } catch (err) {
    console.log(`  error:  ${err instanceof Error ? err.message : String(err)}`);
  }
  console.log("");
}
