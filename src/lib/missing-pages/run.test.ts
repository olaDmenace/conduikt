// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runMissingPages } from "./run";
import type { BuildResult } from "./build";
import type { MissingPageContent } from "./types";
import type { CrawlResult } from "@/src/lib/crawl/site-crawler";

// ---------------------------------------------------------------------------
// A tiny in-memory stand-in for the handful of PostgREST calls run.ts makes:
// select/insert/upsert/update, eq filters, single/maybeSingle, awaitable.
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  let nextId = 1;
  const from = (table: string) => {
    const rows = (tables[table] ??= []);
    const state = { op: "select" as "select" | "insert" | "upsert" | "update", filters: [] as Array<[string, unknown]>, payload: null as unknown, conflict: null as string | null, single: false };
    const matching = () => rows.filter((r) => state.filters.every(([k, v]) => r[k] === v));
    const exec = () => {
      let data: Row[] = [];
      if (state.op === "select") data = matching();
      if (state.op === "insert") {
        const arr = (Array.isArray(state.payload) ? state.payload : [state.payload]) as Row[];
        data = arr.map((p) => {
          const r = { id: `${table}-${nextId++}`, ...p };
          rows.push(r);
          return r;
        });
      }
      if (state.op === "upsert") {
        const keys = (state.conflict ?? "id").split(",");
        const arr = (Array.isArray(state.payload) ? state.payload : [state.payload]) as Row[];
        data = arr.map((p) => {
          const found = rows.find((r) => keys.every((k) => r[k] === p[k]));
          if (found) return Object.assign(found, p);
          const r = { id: `${table}-${nextId++}`, ...p };
          rows.push(r);
          return r;
        });
      }
      if (state.op === "update") data = matching().map((r) => Object.assign(r, state.payload as Row));
      if (state.single) return { data: data[0] ?? null, error: data[0] ? null : { message: "no rows", code: "PGRST116" } };
      return { data, error: null };
    };
    const b = {
      select: () => b,
      insert: (p: unknown) => ((state.op = "insert"), (state.payload = p), b),
      upsert: (p: unknown, o?: { onConflict?: string }) => ((state.op = "upsert"), (state.payload = p), (state.conflict = o?.onConflict ?? null), b),
      update: (p: unknown) => ((state.op = "update"), (state.payload = p), b),
      eq: (k: string, v: unknown) => (state.filters.push([k, v]), b),
      order: () => b,
      limit: () => b,
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.single = true), { then: (res: (v: unknown) => void) => res({ ...exec(), error: null }) }),
      then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise.resolve().then(exec).then(res, rej),
    };
    return b;
  };
  return { supabase: { from } as unknown as SupabaseClient, tables };
}

const goodPage: MissingPageContent = {
  title: "Emergency plumber in Lekki",
  metaDescription: "Same-day emergency plumbing in Lekki, Lagos, from Lekki Plumbers.",
  h1: "Emergency plumber in Lekki",
  entitySentence: "Lekki Plumbers is a plumbing company serving homes in Lekki, Lagos.",
  answer: "Yes, Lekki Plumbers sends a plumber the same day for burst pipes and leaks anywhere in Lekki. Call before noon and we usually arrive within three hours.",
  sections: [
    { heading: "What counts as an emergency?", body: "A burst pipe or sewage backing up." },
    { heading: "How fast can you come?", body: "Within three hours, most days." },
    { heading: "Where we work", body: "Lekki Phase 1, Ikate, Chevron." },
  ],
  faq: [
    { q: "Do you work weekends?", a: "Yes." },
    { q: "Do you quote first?", a: "Yes." },
    { q: "Do you fix heaters?", a: "Yes." },
  ],
  cta: { label: "Call for a quote", href: "tel:+2348000000000" },
  updatedOn: "2026-10-26",
};

const crawl: CrawlResult = {
  source: "sitemap",
  errors: [],
  robots: { fetched: true, aiCrawlersBlocked: { GPTBot: false, ClaudeBot: false, PerplexityBot: false, "Google-Extended": false }, disallowForUs: [] },
  pages: [
    { url: "https://lekki.ng/", title: "Lekki Plumbers", h1: "Plumbing in Lekki", metaDescription: null, textExcerpt: "We fix pipes.", headings: ["Plumbing in Lekki"] },
    { url: "https://lekki.ng/drain-cleaning", title: "Drain cleaning in Lekki", h1: "Drain cleaning", metaDescription: null, textExcerpt: "Blocked drains cleared.", headings: ["Drain cleaning"] },
  ],
};

const project = {
  id: "proj-1",
  name: "Lekki Plumbers",
  website_url: "https://lekki.ng",
  business_type: "local",
  automation_mode: "check_all",
  business_location: "Lekki, Lagos",
  services: ["emergency plumbing", "drain cleaning"],
  value_proposition: "Same-day plumbing",
  target_audience: "homeowners",
  competitors: null,
  positioning_statement: null,
};

const volume = { name: "fake", lookup: async (qs: string[]) => qs.map((query) => ({ query, monthlySearches: query.includes("near me") ? 500 : 40, competition: "low" as const })) };
const build = async (): Promise<BuildResult> => ({ page: goodPage, usage: { inputTokens: 10, outputTokens: 20, model: "claude-sonnet-4-6", durationMs: 5 } });

describe("runMissingPages", () => {
  it("crawls, scores, stores candidates and saves a reviewed draft", async () => {
    const { supabase, tables } = fakeDb({ projects: [project] });
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 1, deps: { crawl: async () => crawl, volume, build } });

    expect(result.error).toBeNull();
    expect(result.pagesCrawled).toBe(2);
    expect(result.queriesChecked).toBeGreaterThan(10);
    expect(result.gapsFound).toBeGreaterThan(5);
    expect(result.pagesWritten).toBe(1);
    expect(result.pagesPublished).toBe(0);

    const candidates = tables.missing_page_candidates;
    expect(candidates.length).toBe(result.gapsFound);
    // "drain cleaning near me" is answered by the drain-cleaning page: not a candidate
    expect(candidates.some((c) => c.query === "drain cleaning near me")).toBe(false);
    expect(candidates.some((c) => c.query === "emergency plumbing near me")).toBe(true);

    const drafted = candidates.filter((c) => c.status === "drafted");
    expect(drafted.length).toBe(1);
    const top = [...candidates].sort((a, b) => Number(b.score) - Number(a.score))[0];
    expect(drafted[0].query).toBe(top.query);
    expect((drafted[0].readiness as { score: number }).score).toBe(100);

    expect(tables.assets).toHaveLength(1);
    expect(tables.assets[0]).toMatchObject({ project_id: "proj-1", type: "seo_page", status: "draft" });
    expect(tables.hosted_pages).toHaveLength(1);
    expect(tables.hosted_pages[0]).toMatchObject({ status: "draft", slug: String(top.query).replace(/\s+/g, "-"), site_slug: "lekki-plumbers", template: "local", asset_id: tables.assets[0].id });
    expect(tables.site_connections[0]).toMatchObject({ kind: "hosted", site_slug: "lekki-plumbers" });

    const run = tables.missing_page_runs[0];
    expect(run.mode).toBe("manual");
    expect(run.finished_at).toBeTruthy();
    expect(run.pages_written).toBe(1);
    expect(run.error).toBeNull();
    expect(tables.ai_generations[0]).toMatchObject({ agent_used: "missing-page", input_tokens: 10 });
  });

  it("keeps a dismissed candidate dismissed and publishes when the project is Hands off", async () => {
    const { supabase, tables } = fakeDb({
      projects: [{ ...project, automation_mode: "hands_off" }],
      site_connections: [{ id: "sc-1", project_id: "proj-1", kind: "hosted", site_slug: "lekki" }],
      missing_page_candidates: [{ id: "c-old", project_id: "proj-1", query: "emergency plumbing near me", status: "dismissed", score: 99 }],
    });
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "nightly", maxPages: 3, deps: { crawl: async () => crawl, volume, build } });

    expect(result.error).toBeNull();
    expect(result.pagesWritten).toBe(1); // nightly writes one page
    expect(result.pagesPublished).toBe(1);
    expect(result.written[0].published).toBe(true);
    expect(result.written[0].url).toBe(`https://lekki.conduikt.site/${tables.hosted_pages[0].slug}`);

    const dismissed = tables.missing_page_candidates.find((c) => c.query === "emergency plumbing near me");
    expect(dismissed?.status).toBe("dismissed");
    expect(tables.hosted_pages[0].status).toBe("published");
    expect(tables.hosted_pages[0].site_slug).toBe("lekki");
    expect(tables.assets[0].status).toBe("published");
    expect(tables.missing_page_candidates.find((c) => c.status === "published")).toBeTruthy();
  });

  it("refuses to overwrite another project's page at the same hosted address", async () => {
    // Find which query the run would write first, then park another project's page there.
    const dry = fakeDb({ projects: [project] });
    await runMissingPages({ projectId: "proj-1", supabase: dry.supabase, mode: "manual", maxPages: 1, deps: { crawl: async () => crawl, volume, build } });
    const top = dry.tables.missing_page_candidates.find((c) => c.status === "drafted")!;
    const slug = String(dry.tables.hosted_pages[0].slug);

    const { supabase, tables } = fakeDb({
      projects: [project],
      hosted_pages: [{ id: "hp-other", project_id: "proj-2", site_slug: "lekki-plumbers", slug, status: "published", title: "Theirs" }],
    });
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 1, deps: { crawl: async () => crawl, volume, build } });

    expect(result.pagesWritten).toBe(0);
    expect(tables.hosted_pages).toHaveLength(1);
    expect(tables.hosted_pages[0]).toMatchObject({ id: "hp-other", project_id: "proj-2", status: "published", title: "Theirs" });
    const candidate = tables.missing_page_candidates.find((c) => c.query === top.query);
    expect(candidate?.status).toBe("failed");
    expect(String(candidate?.last_error)).toContain("belongs to another project");
  });

  it("releases a candidate from writing when saving the page fails", async () => {
    const { supabase, tables } = fakeDb({ projects: [project] });
    const raw = supabase.from.bind(supabase);
    (supabase as unknown as { from: typeof raw }).from = (table: string) => {
      if (table === "assets") throw new Error("disk full");
      return raw(table);
    };
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 1, deps: { crawl: async () => crawl, volume, build } });

    expect(result.pagesWritten).toBe(0);
    expect(tables.missing_page_candidates.some((c) => c.status === "writing")).toBe(false);
    const failed = tables.missing_page_candidates.find((c) => c.status === "failed");
    expect(String(failed?.last_error)).toContain("disk full");
  });

  it("records the AI-unavailable error and leaves the candidate open", async () => {
    const { supabase, tables } = fakeDb({ projects: [project] });
    const failing = async (): Promise<BuildResult> => {
      const err = new Error("AI unavailable (no_credit)") as Error & { userMessage: string };
      err.name = "AIUnavailableError";
      err.userMessage = "We couldn't reach the writing service. Nothing was charged. Try again in a few minutes.";
      throw err;
    };
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 2, deps: { crawl: async () => crawl, volume, build: failing } });

    expect(result.error).toEqual({ code: "ai_unavailable", message: "We couldn't reach the writing service. Nothing was charged. Try again in a few minutes." });
    expect(result.pagesWritten).toBe(0);
    expect(tables.missing_page_candidates.every((c) => c.status === "open")).toBe(true);
    expect(tables.assets ?? []).toHaveLength(0);
    expect(String(tables.missing_page_runs[0].error)).toContain("ai_unavailable");
  });
});
