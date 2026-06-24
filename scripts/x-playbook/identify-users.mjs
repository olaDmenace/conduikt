#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ids = ["e2bb2edd-6d6c-4288-a386-145151c264ba", "8410d217-06c0-44ad-ba4d-dd383076e026"];
const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
for (const id of ids) {
  const u = users.find((x) => x.id === id);
  console.log(`\n=== user ${id} ===`);
  if (!u) { console.log("  NOT FOUND"); continue; }
  console.log(`  email:           ${u.email}`);
  console.log(`  created:         ${u.created_at}`);
  console.log(`  last sign-in:    ${u.last_sign_in_at}`);
  console.log(`  email confirmed: ${u.email_confirmed_at ?? "no"}`);
  console.log(`  provider(s):     ${(u.app_metadata?.providers ?? []).join(", ")}`);

  const { data: projects } = await db.from("projects").select("id, name").eq("user_id", id);
  console.log(`  projects:        ${projects?.map(p => `${p.name} (${p.id})`).join(", ") ?? "none"}`);

  const { data: accts } = await db.from("connected_accounts").select("platform, platform_username").eq("user_id", id);
  console.log(`  connected:       ${accts?.map(a => `${a.platform}:${a.platform_username ?? "?"}`).join(", ") ?? "none"}`);
}
