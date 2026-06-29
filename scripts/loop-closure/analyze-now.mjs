#!/usr/bin/env node
// Manual one-shot runner for the loop-closure analyzer.
// Prints what it found and optionally writes to post_learnings.
//
// Run:
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json \
//     scripts/loop-closure/analyze-now.mjs <project-id> <channel> [--dry]
//
// Examples:
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json \
//     scripts/loop-closure/analyze-now.mjs <project-uuid> x --dry
//
//   # Same but persist:
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json \
//     scripts/loop-closure/analyze-now.mjs <project-uuid> x

import { runAnalyzer } from "../../src/lib/loop-closure/analyzer";

const [, , projectId, channel, ...flags] = process.argv;
const dry = flags.includes("--dry");

if (!projectId || !channel) {
  console.error(
    "Usage: analyze-now.mjs <project-id> <channel> [--dry]\n" +
      "  channel: x | linkedin | facebook | email"
  );
  process.exit(1);
}

if (!["x", "linkedin", "facebook", "email"].includes(channel)) {
  console.error(`Invalid channel: ${channel}. Expected x|linkedin|facebook|email.`);
  process.exit(1);
}

console.log(`Analyzer run`);
console.log(`  project: ${projectId}`);
console.log(`  channel: ${channel}`);
console.log(`  mode:    ${dry ? "DRY (no writes)" : "LIVE (will upsert post_learnings)"}`);
console.log("");

const result = await runAnalyzer({
  projectId,
  channel,
  persist: !dry,
});

console.log(`Posts considered: ${result.postsConsidered}`);
console.log(`Window: ${result.rangeStart} → ${result.rangeEnd}`);
console.log(
  `Model tokens: in=${result.modelInputTokens} out=${result.modelOutputTokens}`
);
console.log("");

if (result.learnings.length === 0) {
  console.log("No learnings extracted.");
  if (result.postsConsidered < 6) {
    console.log("(Likely cause: not enough posts with metrics in the window yet.)");
  }
  process.exit(0);
}

console.log(`Learnings (${result.learnings.length}):`);
for (const l of result.learnings) {
  console.log(`\n  [${l.patternKey}] confidence=${l.confidence}`);
  console.log(`  ${l.hypothesis}`);
  console.log(
    `  lift=${l.evidence.lift}x  n=${l.evidence.sampleSize}  ` +
      `control_mean=${l.evidence.controlMean}  treatment_mean=${l.evidence.treatmentMean}`
  );
}

if (dry) {
  console.log("\n(DRY mode — nothing written. Re-run without --dry to persist.)");
} else {
  console.log("\n✓ Learnings persisted to post_learnings.");
}
