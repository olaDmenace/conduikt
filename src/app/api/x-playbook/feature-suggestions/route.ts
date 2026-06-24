import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import digest from "@/src/lib/x-playbook/shipping-digest.json";

// Serves shipping-digest.json — a pre-computed feed of "tweet-worthy"
// commits across olaDmenace/conduikt + olaDmenace/pitch-odds. The digest
// is generated locally by `node scripts/x-playbook/git-shipping-digest.mjs`
// (the repos are private so the live route can't hit the GitHub API
// unauthenticated).
//
// Re-run the digest script after notable commits to refresh — then commit
// + push the regenerated shipping-digest.json.

interface DigestItem {
  repo: string;
  sha: string;
  subject: string;
  clean: string;
  date: string;
  weekKey: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = (digest.items ?? []) as DigestItem[];

  // Group by weekKey for the admin UI, newest week first.
  const groupsByWeek = new Map<string, DigestItem[]>();
  for (const item of items) {
    if (!groupsByWeek.has(item.weekKey)) groupsByWeek.set(item.weekKey, []);
    groupsByWeek.get(item.weekKey)!.push(item);
  }
  const groups = [...groupsByWeek.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([weekKey, items]) => ({ weekKey, items }));

  return NextResponse.json({
    generatedAt: digest.generatedAt,
    count: items.length,
    items, // flat list, newest first (for backwards compat with the dropdown)
    groups, // grouped by ISO week
  });
}
