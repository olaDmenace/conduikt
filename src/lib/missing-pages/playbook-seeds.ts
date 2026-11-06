// Loads intent seeds from src/lib/playbooks.ts (PLAYBOOKS[type].intentSeeds)
// when that module exists, and says so when it doesn't. Kept in its own
// file so the dependency is a single line to change.
//
// The import is dynamic and guarded: under vitest (SSR transform) a missing
// module is left to Node, which rejects, and the rejection is swallowed.
// A production build still needs src/lib/playbooks.ts to exist (WS-D
// ships it); a one-line `export const PLAYBOOKS = {}` stub is enough.

import type { BusinessType } from "./types";

export async function loadPlaybookSeeds(type: BusinessType): Promise<string[] | null> {
  try {
    const mod = (await import("@/src/lib/playbooks")) as {
      PLAYBOOKS?: Record<string, { intentSeeds?: unknown }>;
    };
    const seeds = mod?.PLAYBOOKS?.[type]?.intentSeeds;
    if (Array.isArray(seeds) && seeds.every((s) => typeof s === "string")) return seeds as string[];
    return null;
  } catch {
    return null;
  }
}
