#!/usr/bin/env node
// Hex-colour ratchet — docs/DESIGN.md §Phase 1.
//
// Rule: no colour literal (#RGB / #RRGGBB / #RRGGBBAA) inside src/ outside
// src/styles/globals.css. Pre-v2 code has many, so this is a ratchet, not
// a wall: scripts/hex-baseline.json records the allowed count per file.
// The check fails when a file gains literals or a new file introduces
// one. Counts only go down: run with --update after removing literals to
// lock in the lower number.
//
//   npm run check:hex           # CI
//   npm run check:hex -- --update   # after a cleanup, tighten the baseline

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const BASELINE = join(ROOT, "scripts", "hex-baseline.json");
const ALLOWED = new Set(["src/styles/globals.css"]);
const EXT = /\.(tsx?|jsx?|css|mjs)$/;
// A hex colour: # then 3, 4, 6 or 8 hex digits, not followed by more
// word characters (so "#section-id" and "#1234567" don't match).
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(p, out);
    } else if (EXT.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const counts = {};
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  if (ALLOWED.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  // Ignore JSON-LD / URL fragments like href="#pricing" — they don't
  // match the hex pattern unless the fragment is pure hex, which is rare.
  const n = (text.match(HEX) || []).length;
  if (n > 0) counts[rel] = n;
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);

if (process.argv.includes("--update") || !existsSync(BASELINE)) {
  const sorted = Object.fromEntries(Object.entries(counts).sort());
  writeFileSync(BASELINE, JSON.stringify({ total, files: sorted }, null, 2) + "\n");
  console.log(`hex baseline written: ${total} literals in ${Object.keys(counts).length} files`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8")).files;
const regressions = [];
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (n > allowed) regressions.push(`${file}: ${n} (allowed ${allowed})`);
}

if (regressions.length) {
  console.error("New hex colour literals found. Use a token from src/styles/globals.css instead:");
  for (const r of regressions) console.error("  " + r);
  process.exit(1);
}

const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`hex check ok: ${total} legacy literals (baseline ${baseTotal}).`);
if (total < baseTotal) console.log("Counts went down — run `npm run check:hex -- --update` to lock it in.");
