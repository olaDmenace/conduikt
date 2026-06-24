#!/usr/bin/env node
// Apply post-feedback content fixes to already-loaded evergreen posts.
// Idempotent — re-running with the same target text is a no-op.

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const FIXES = [
  {
    ref: "d1-a-pinned-intro",
    desc: "Append link tweet to Day 1 intro thread",
    transform: (text) => {
      const linkLine = "\n\n🔗 https://pitch-odds.vercel.app";
      if (text.includes("pitch-odds.vercel.app")) return text;
      return text + linkLine;
    },
  },
  {
    ref: "d6-b-lessons-thread",
    desc: "Day 6 lessons: '4 AI products' → 'a handful of AI products'",
    transform: (text) => text.replace(
      /I shipped 4 AI products/,
      "I shipped a handful of AI products"
    ),
  },
  {
    ref: "d2-c-trust-feature",
    desc: "Day 2 C: replace question with declarative calibration value post",
    transform: () =>
      "The bar for any prediction tool isn't \"were you right?\" — it's \"did you tell me, before the match, how unsure you were?\" Most accounts hide uncertainty. Calibration is the receipts.",
  },
  {
    ref: "d3-c-prob-poll",
    desc: "Day 3 C: replace poll with declarative probability-literacy take",
    transform: () =>
      "Half the people following football-prediction accounts read \"55% home win\" as \"home will win.\" It actually means \"slightly better than a coin flip.\" Calibration matters more than calls — and most accounts hide both.",
  },
  {
    ref: "d4-c-marketing-task",
    desc: "Day 4 C: replace question with declarative AI-marketing take",
    transform: () =>
      "Building AI marketing means resisting the urge to wrap ChatGPT in a nicer UI. The hard part — research → publish → measure → adjust — is what's worth building. Polish without the loop is theatre.",
  },
];

const DRY_RUN = process.env.DRY_RUN !== "false";
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

for (const fix of FIXES) {
  const { data: asset, error } = await db
    .from("assets")
    .select("id, content")
    .eq("content->>ref", fix.ref)
    .maybeSingle();

  if (error) {
    console.error(`[${fix.ref}] lookup error:`, error.message);
    continue;
  }
  if (!asset) {
    console.warn(`[${fix.ref}] no asset found — skipping`);
    continue;
  }

  const oldText = asset.content?.scheduled_text ?? "";
  const newText = fix.transform(oldText);

  if (oldText === newText) {
    console.log(`[${fix.ref}] already current, no change.`);
    continue;
  }

  console.log(`[${fix.ref}] ${fix.desc}`);
  console.log(`  before: ${oldText.slice(-120)}...`);
  console.log(`  after:  ${newText.slice(-120)}...`);

  if (DRY_RUN) continue;

  const { error: uerr } = await db
    .from("assets")
    .update({
      content: { ...asset.content, scheduled_text: newText },
    })
    .eq("id", asset.id);

  if (uerr) {
    console.error(`[${fix.ref}] update error:`, uerr.message);
  } else {
    console.log(`[${fix.ref}] ✓ updated`);
  }
}

if (DRY_RUN) {
  console.log("\nDRY RUN — re-run with DRY_RUN=false to apply.");
}
