// Candidate search phrases for a project: the things people type that a
// business of this kind should have a page for. Built from the project's
// own facts (services, place, audience, competitors) crossed with intent
// seeds, playbook-provided when available, built in otherwise.

import { loadPlaybookSeeds } from "./playbook-seeds";
import type { BusinessType, ProjectFacts } from "./types";

export const MAX_QUERIES = 60;

export const LOCAL_SEEDS = [
  "{service} near me",
  "{service} prices",
  "{service} cost",
  "emergency {service}",
  "same-day {service}",
  "{service} {location}",
  "best {service} in {location}",
  "free estimate {service}",
  "weekend {service}",
  "{service} reviews",
];

export const SAAS_SEEDS = [
  "{product} pricing",
  "{product} alternative",
  "{product} vs {competitor}",
  "{category} for {audience}",
  "{category} template",
  "how to {job}",
];

export function builtInSeeds(type: BusinessType): string[] {
  return type === "local" ? LOCAL_SEEDS : SAAS_SEEDS;
}

function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "emergency plumbing" -> "fix a burst pipe" is the agent's job; here we only derive a plain verb phrase. */
function jobsFrom(facts: ProjectFacts): string[] {
  const jobs: string[] = [];
  for (const s of facts.services) jobs.push(s);
  if (facts.valueProposition) {
    const vp = clean(facts.valueProposition);
    const m = vp.match(/\b(?:helps?|lets?|so you can|to)\s+(?:you\s+)?(.{8,60}?)(?:[.,;]|$)/);
    if (m) jobs.push(m[1].trim());
  }
  return jobs;
}

interface Vars {
  service: string[];
  location: string[];
  product: string[];
  competitor: string[];
  category: string[];
  audience: string[];
  job: string[];
  /** Playbook seeds also use {name} (the business) and {topic} (what it talks about). */
  name: string[];
  topic: string[];
}

function expand(seed: string, vars: Vars): string[] {
  const slots = Array.from(seed.matchAll(/\{(\w+)\}/g)).map((m) => m[1] as keyof Vars);
  const unique = Array.from(new Set(slots));
  if (unique.length === 0) return [seed];
  let out: string[] = [seed];
  for (const slot of unique) {
    const values = vars[slot] ?? [];
    if (values.length === 0) return [];
    const next: string[] = [];
    for (const partial of out) for (const v of values) next.push(partial.split(`{${slot}}`).join(v));
    out = next;
  }
  return out;
}

/** Pure: seeds in, phrases out. Capped and de-duplicated. */
export function buildIntentQueries(facts: ProjectFacts, seeds: string[]): string[] {
  const services = facts.services.map(clean).filter(Boolean);
  const vars: Vars = {
    service: services,
    location: facts.location ? [clean(facts.location)] : [],
    product: [clean(facts.name)],
    competitor: facts.competitors.map(clean).filter(Boolean).slice(0, 4),
    category: facts.category ? [clean(facts.category)] : services.slice(0, 1),
    audience: facts.audience.map(clean).filter(Boolean).slice(0, 3),
    job: jobsFrom(facts).map(clean).filter(Boolean).slice(0, 4),
    name: [clean(facts.name)],
    topic: (services.length ? services : facts.category ? [clean(facts.category)] : []).slice(0, 4),
  };

  const seen = new Set<string>();
  const out: string[] = [];
  // Round-robin across seeds so the cap doesn't starve later seeds when a
  // business lists many services.
  const expanded = seeds.map((s) => expand(s, vars));
  let added = true;
  for (let i = 0; added && out.length < MAX_QUERIES; i++) {
    added = false;
    for (const list of expanded) {
      const q = list[i];
      if (q === undefined) continue;
      added = true;
      const key = clean(q);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
      if (out.length >= MAX_QUERIES) break;
    }
  }
  return out;
}

/** Seeds from the playbook when present, else built in; then the queries. */
export async function buildIntentQueriesForProject(facts: ProjectFacts): Promise<string[]> {
  const playbook = await loadPlaybookSeeds(facts.businessType);
  const seeds = playbook && playbook.length > 0 ? playbook : builtInSeeds(facts.businessType);
  return buildIntentQueries(facts, seeds);
}
