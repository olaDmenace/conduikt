import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

// Surfaces recent "feat(...)" commits from the relevant repos so the playbook
// owner can use them as candidates for {SHIPPED_FEATURE} bracket inputs.
//
// Public-repo reads only — no GitHub token needed. The 60/hr unauthenticated
// rate limit is plenty for an interactive admin page.

const REPOS = [
  "olaDmenace/conduikt",
  "olaDmenace/bet-spur", // PitchOdds
];

interface CommitSummary {
  repo: string;
  sha: string;
  subject: string;
  url: string;
  date: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all: CommitSummary[] = [];
  const errors: { repo: string; error: string }[] = [];

  for (const repo of REPOS) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/commits?per_page=30`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Conduikt-XPlaybook-Suggester",
          },
          // Don't cache — we want fresh commits when the owner reloads
          cache: "no-store",
        }
      );

      if (!res.ok) {
        errors.push({ repo, error: `${res.status} ${res.statusText}` });
        continue;
      }

      const commits = (await res.json()) as Array<{
        sha: string;
        commit: { message: string; author: { date: string } };
        html_url: string;
      }>;

      for (const c of commits) {
        const subject = c.commit.message.split("\n")[0];
        // Only show feature-ish commits; skip chore/fix/docs/refactor/style.
        if (!/^(feat|feature)[(:]/i.test(subject)) continue;
        all.push({
          repo,
          sha: c.sha.slice(0, 7),
          subject,
          url: c.html_url,
          date: c.commit.author.date,
        });
      }
    } catch (err) {
      errors.push({
        repo,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // Newest first across all repos.
  all.sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ suggestions: all.slice(0, 20), errors });
}
