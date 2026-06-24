#!/usr/bin/env node
// Scans the full git history of olaDmenace/conduikt + olaDmenace/pitch-odds
// (PitchOdds) and produces a markdown digest of tweet-worthy shipping
// moments — clean human-readable subjects, grouped by ISO week, ready to
// drop into /admin/x-playbook bracket fields.
//
// No Anthropic API calls — pure GitHub public API (60/hr unauthenticated,
// which is plenty for the small batches per repo).
//
// Run:
//   node scripts/x-playbook/git-shipping-digest.mjs
//
// Output: X-Playbook-Shipping-Digest.md at the repo root (gitignored).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

const REPOS = [
  { name: "Conduikt", path: path.resolve(".") },
  { name: "PitchOdds", path: path.join(os.homedir(), "Desktop", "projects", "bet-spur") },
];

// How many commits back to read per repo.
const COMMIT_LIMIT = 500;
const OUT_MD = path.resolve("X-Playbook-Shipping-Digest.md");
const OUT_JSON = path.resolve("src/lib/x-playbook/shipping-digest.json");

// Reads git log from a local repo. Returns array of {sha, subject, date}.
function readLocalCommits(repoPath) {
  if (!fs.existsSync(path.join(repoPath, ".git"))) {
    console.error(`[${repoPath}] not a git repo`);
    return [];
  }
  // %H = full sha, %ai = author iso date, %s = subject. Use \x1F (unit separator) as field sep.
  const out = execFileSync(
    "git",
    ["-C", repoPath, "log", `--max-count=${COMMIT_LIMIT}`, "--pretty=format:%H\x1F%ai\x1F%s"],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, dateStr, subject] = line.split("\x1F");
      return { sha, dateIso: dateStr, subject };
    });
}

// Strip conventional-commit prefix and clean up.
function clean(subject) {
  let s = subject.trim();
  // Strip "feat(scope)!: " or "feat: " prefix
  s = s.replace(/^(feat|feature|fix|perf|refactor)(\([^)]*\))?!?:\s*/i, "");
  // Capitalize first letter
  s = s.charAt(0).toUpperCase() + s.slice(1);
  // Trim trailing period
  s = s.replace(/\.\s*$/, "");
  return s;
}

// Decide whether a commit subject is "tweet-worthy" — user-facing changes,
// not chores or internal refactors.
function isWorthMentioning(subject) {
  const s = subject.toLowerCase();
  // Always include feat
  if (/^feat(\([^)]*\))?!?:/.test(s)) return true;
  // Breaking-change marker on any prefix
  if (/^(feat|fix|refactor|perf)(\([^)]*\))?!:/.test(s)) return true;
  // Notable fixes (UX-affecting, not "fix typo")
  if (/^fix(\([^)]*\))?:/.test(s)) {
    const body = s.replace(/^fix(\([^)]*\))?:\s*/, "");
    if (body.length < 25) return false; // too vague
    if (/typo|comment|test|lint|ci|deps|whitespace/.test(body)) return false;
    return true;
  }
  return false;
}

// ISO-week key: YYYY-Www
function isoWeekKey(dateIso) {
  const d = new Date(dateIso);
  const day = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(key) {
  // Convert "2026-W26" → "Week of Mon Jun 22" (Mon of that ISO week)
  const [year, w] = key.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = (jan4.getUTCDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - dayOfWeek);
  const mon = new Date(week1Mon);
  mon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
  return mon.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

(async () => {
  const lines = [];
  const allItems = []; // flat list for the JSON output
  lines.push("# X Playbook — Shipping Digest");
  lines.push("");
  lines.push(`> Auto-generated from \`feat(...)\` and major \`fix(...)\` commits across olaDmenace/conduikt + olaDmenace/pitch-odds. Drop any of these into \`/admin/x-playbook\` SHIPPED_FEATURE fields. Run \`node scripts/x-playbook/git-shipping-digest.mjs\` to refresh.`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString().slice(0, 16)}Z`);
  lines.push("");

  for (const repo of REPOS) {
    console.log(`reading ${repo.name} (${repo.path})…`);
    const commits = readLocalCommits(repo.path);
    console.log(`  ${commits.length} commits`);

    const buckets = new Map();
    for (const c of commits) {
      if (!isWorthMentioning(c.subject)) continue;
      const key = isoWeekKey(c.dateIso);
      const item = {
        repo: repo.name,
        sha: c.sha.slice(0, 7),
        subject: c.subject,
        clean: clean(c.subject),
        date: c.dateIso,
        weekKey: key,
      };
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
      allItems.push(item);
    }

    lines.push(`---`);
    lines.push("");
    lines.push(`## ${repo.name}`);
    lines.push("");

    if (buckets.size === 0) {
      lines.push("_No tweet-worthy commits found._");
      lines.push("");
      continue;
    }

    const sortedWeeks = [...buckets.keys()].sort().reverse();
    for (const week of sortedWeeks) {
      const items = buckets.get(week).sort((a, b) => (a.date < b.date ? 1 : -1));
      lines.push(`### ${week} — week of ${weekLabel(week)} (${items.length})`);
      lines.push("");
      for (const it of items) {
        lines.push(`- **${it.clean}**`);
        lines.push(`  - \`${it.sha}\` · ${it.date.slice(0, 10)}`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## How to use this");
  lines.push("");
  lines.push("Filling a SHIPPED_FEATURE bracket field on `/admin/x-playbook`? Browse this digest, find a moment that's still tweet-worthy in context, drop the **bold** summary into the field. If a commit's clean subject still reads too jargon-y, edit it before pasting — the goal is human prose, not git prose.");
  lines.push("");

  fs.writeFileSync(OUT_MD, lines.join("\n"));
  console.log(`\n✓ wrote ${OUT_MD}`);

  // Sort items newest first for the live JSON the admin API serves.
  allItems.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: allItems.length,
        items: allItems,
      },
      null,
      2
    )
  );
  console.log(`✓ wrote ${OUT_JSON} (${allItems.length} items)`);
})();
