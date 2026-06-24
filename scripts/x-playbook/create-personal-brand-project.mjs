#!/usr/bin/env node
// Creates a 'Personal Brand' project owned by user A (oladmenace@gmail.com).
// Safe to re-run: skips if a project with that name already exists for that user.

import { createClient } from "@supabase/supabase-js";

const USER_ID = "e2bb2edd-6d6c-4288-a386-145151c264ba"; // oladmenace@gmail.com
const PROJECT_NAME = "Personal Brand";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: existing } = await db
  .from("projects")
  .select("id, name, created_at")
  .eq("user_id", USER_ID)
  .eq("name", PROJECT_NAME)
  .maybeSingle();

if (existing) {
  console.log(`Project already exists. id=${existing.id}`);
  process.exit(0);
}

// Inspect a sample row to learn required columns
const { data: sample } = await db.from("projects").select("*").limit(1);
if (sample?.[0]) {
  console.log("projects columns:", Object.keys(sample[0]).join(", "));
}

const { data: created, error } = await db
  .from("projects")
  .insert({
    user_id: USER_ID,
    name: PROJECT_NAME,
  })
  .select("id, name, created_at")
  .single();

if (error) {
  console.error("project insert failed:", error.message);
  console.error("hint: re-run with required cols included");
  process.exit(1);
}

console.log(`Created project. id=${created.id} name="${created.name}" created=${created.created_at}`);
console.log(`\nPROJECT_ID=${created.id}`);
