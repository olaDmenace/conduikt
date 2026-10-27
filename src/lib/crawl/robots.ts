// A basic robots.txt parser: enough to honour Disallow for our own crawler
// and to tell whether the common AI crawlers are shut out (which matters
// for "Ready for Google and AI answers").

export const OUR_USER_AGENT = "ConduiktBot";

export const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"] as const;
export type AiCrawler = (typeof AI_CRAWLERS)[number];

export interface RobotsInfo {
  /** false when robots.txt was missing or unreadable (everything allowed). */
  fetched: boolean;
  /** For each AI crawler: true when it may not read the site root. */
  aiCrawlersBlocked: Record<AiCrawler, boolean>;
  /** Disallow rules that apply to ConduiktBot. */
  disallowForUs: string[];
}

interface Group {
  agents: string[];
  disallow: string[];
  allow: string[];
}

export function parseRobots(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "disallow") current.disallow.push(value);
    else if (key === "allow") current.allow.push(value);
  }
  return groups;
}

/** The group that applies to an agent: an exact/prefix match wins, else "*". */
function groupFor(groups: Group[], agent: string): Group | null {
  const a = agent.toLowerCase();
  const specific = groups.find((g) => g.agents.some((ua) => ua !== "*" && (a.startsWith(ua) || ua.startsWith(a))));
  if (specific) return specific;
  return groups.find((g) => g.agents.includes("*")) ?? null;
}

function patternMatches(pattern: string, path: string): boolean {
  if (!pattern) return false;
  // "*" wildcard and "$" end anchor, per the de facto standard.
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const anchored = escaped.endsWith("\\$") ? `^${escaped.slice(0, -2)}$` : `^${escaped}`;
  return new RegExp(anchored).test(path);
}

/** Whether `agent` may fetch `path` under these rules (longest match wins). */
export function isAllowed(groups: Group[], agent: string, path: string): boolean {
  const g = groupFor(groups, agent);
  if (!g) return true;
  let best: { allow: boolean; len: number } = { allow: true, len: -1 };
  for (const p of g.disallow) {
    if (patternMatches(p, path) && p.length > best.len) best = { allow: false, len: p.length };
  }
  for (const p of g.allow) {
    if (patternMatches(p, path) && p.length >= best.len) best = { allow: true, len: p.length };
  }
  return best.allow;
}

export function robotsInfo(text: string | null): RobotsInfo {
  const blocked = Object.fromEntries(AI_CRAWLERS.map((c) => [c, false])) as Record<AiCrawler, boolean>;
  if (text === null) return { fetched: false, aiCrawlersBlocked: blocked, disallowForUs: [] };
  const groups = parseRobots(text);
  for (const c of AI_CRAWLERS) blocked[c] = !isAllowed(groups, c, "/");
  const ours = groupFor(groups, OUR_USER_AGENT);
  return { fetched: true, aiCrawlersBlocked: blocked, disallowForUs: ours?.disallow.filter(Boolean) ?? [] };
}
