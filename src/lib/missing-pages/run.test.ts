// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { approveRevision, discardRevision, runMissingPages, writeCandidate, type CandidateRow } from "./run";
import { upsertWordPressPage } from "@/src/lib/integrations/wordpress";

// The WordPress target is the only network call approveRevision can make.
vi.mock("@/src/lib/integrations/wordpress", () => ({
  upsertWordPressPage: vi.fn(),
  normaliseBaseUrl: (s: string) => s.replace(/\/+$/, ""),
}));
const wordpress = vi.mocked(upsertWordPressPage);
import { factsFromProject } from "./facts";
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
    const state = { op: "select" as "select" | "insert" | "upsert" | "update" | "delete", filters: [] as Array<[string, unknown]>, payload: null as unknown, conflict: null as string | null, single: false };
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
      if (state.op === "delete") {
        data = matching();
        for (const r of data) rows.splice(rows.indexOf(r), 1);
      }
      if (state.single) return { data: data[0] ?? null, error: data[0] ? null : { message: "no rows", code: "PGRST116" } };
      return { data, error: null };
    };
    const b = {
      select: () => b,
      insert: (p: unknown) => ((state.op = "insert"), (state.payload = p), b),
      upsert: (p: unknown, o?: { onConflict?: string }) => ((state.op = "upsert"), (state.payload = p), (state.conflict = o?.onConflict ?? null), b),
      update: (p: unknown) => ((state.op = "update"), (state.payload = p), b),
      delete: () => ((state.op = "delete"), b),
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
  blocked: false,
  fetchedAny: true,
  failedStatus: null,
  failedError: null,
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

  it("stops before intents when the site could not be read, writes nothing and records why", async () => {
    const { supabase, tables } = fakeDb({
      projects: [project],
      // The last good run's candidate stays exactly as it was.
      missing_page_candidates: [{ id: "c-old", project_id: "proj-1", query: "emergency plumbing near me", status: "open", score: 80 }],
    });
    const blocked: CrawlResult = { ...crawl, pages: [], source: "none", blocked: true, fetchedAny: false, failedStatus: 403, failedError: null, errors: ["https://lekki.ng/: 403 blocked by bot protection"] };
    const buildSpy = vi.fn(build);
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 3, deps: { crawl: async () => blocked, volume, build: buildSpy } });

    expect(result.error).toEqual({
      code: "site_unreachable",
      message: "We couldn't read lekki.ng (status 403). It looks like your site's bot protection blocked us. Allow the user agent ConduiktBot and try again.",
    });
    expect(result.pagesCrawled).toBe(0);
    expect(result.queriesChecked).toBe(0);
    expect(result.gapsFound).toBe(0);
    expect(result.pagesWritten).toBe(0);
    expect(buildSpy).not.toHaveBeenCalled();

    // No candidate was added or touched; nothing was drafted.
    expect(tables.missing_page_candidates).toHaveLength(1);
    expect(tables.missing_page_candidates[0]).toMatchObject({ id: "c-old", status: "open", score: 80 });
    expect(tables.hosted_pages ?? []).toHaveLength(0);

    // The run row carries the reason so the page and the nightly log can show it.
    const run = tables.missing_page_runs[0];
    expect(run.finished_at).toBeTruthy();
    expect(run.pages_crawled).toBe(0);
    expect(run.pages_written).toBe(0);
    expect(String(run.error)).toContain("site_unreachable:");
    expect(String(run.error)).toContain("bot protection");
  });

  it("treats a timed-out site the same way, with a timed-out message", async () => {
    const { supabase, tables } = fakeDb({ projects: [project] });
    const timedOut: CrawlResult = { ...crawl, pages: [], source: "none", blocked: false, fetchedAny: false, failedStatus: null, failedError: "timed out", errors: [] };
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "nightly", maxPages: 1, deps: { crawl: async () => timedOut, volume, build } });
    expect(result.error?.code).toBe("site_unreachable");
    expect(result.error?.message).toBe("We couldn't read lekki.ng right now (timed out). Try again in a few minutes.");
    expect(tables.missing_page_candidates ?? []).toHaveLength(0);
  });

  it("writes nothing when robots.txt and the sitemap answered but every page request failed", async () => {
    // The edge served robots.txt and sitemap.xml in a few milliseconds; the
    // origin behind it timed out on every page. Zero pages is not "every
    // search is a gap": a pricing page must not be written for a site that
    // already has one.
    const { supabase, tables } = fakeDb({ projects: [project] });
    const originDown: CrawlResult = {
      ...crawl,
      pages: [],
      source: "sitemap",
      blocked: false,
      fetchedAny: false,
      failedStatus: null,
      failedError: "timed out",
      errors: ["https://lekki.ng/: timed out", "https://lekki.ng/drain-cleaning: timed out"],
    };
    const buildSpy = vi.fn(build);
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "nightly", maxPages: 3, deps: { crawl: async () => originDown, volume, build: buildSpy } });
    expect(result.error?.code).toBe("site_unreachable");
    expect(result.error?.message).toBe("We couldn't read lekki.ng right now (timed out). Try again in a few minutes.");
    expect(result.gapsFound).toBe(0);
    expect(result.pagesWritten).toBe(0);
    expect(buildSpy).not.toHaveBeenCalled();
    expect(tables.missing_page_candidates ?? []).toHaveLength(0);
    expect(tables.hosted_pages ?? []).toHaveLength(0);
  });

  it("still runs a hosted-only project (no website) from its services", async () => {
    const { supabase, tables } = fakeDb({ projects: [{ ...project, website_url: null }] });
    const crawlSpy = vi.fn(async () => crawl);
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 1, deps: { crawl: crawlSpy, volume, build } });
    expect(crawlSpy).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.pagesCrawled).toBe(0);
    expect(result.gapsFound).toBeGreaterThan(0);
    expect(tables.missing_page_candidates.length).toBe(result.gapsFound);
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

  it("stops with nothing_to_check, and counts no run, when there is no website and no services", async () => {
    const { supabase, tables } = fakeDb({ projects: [{ ...project, website_url: null, services: [] }] });
    let crawled = false;
    const result = await runMissingPages({
      projectId: "proj-1",
      supabase,
      mode: "nightly",
      maxPages: 1,
      deps: {
        crawl: async () => {
          crawled = true;
          return crawl;
        },
        volume,
        build,
      },
    });

    expect(result.error).toEqual({ code: "nothing_to_check", message: "Add what you offer in Settings so we know what to look for." });
    expect(result.runId).toBeNull();
    expect(tables.missing_page_runs ?? []).toHaveLength(0);
    expect(tables.missing_page_candidates ?? []).toHaveLength(0);
    expect(crawled).toBe(false);
  });

  it("still runs with services and no website (every search counts as missing)", async () => {
    const { supabase } = fakeDb({ projects: [{ ...project, website_url: null }] });
    const result = await runMissingPages({ projectId: "proj-1", supabase, mode: "manual", maxPages: 1, deps: { crawl: async () => crawl, volume, build } });
    expect(result.error).toBeNull();
    expect(result.pagesCrawled).toBe(0);
    expect(result.pagesWritten).toBe(1);
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

// ---------------------------------------------------------------------------
// Re-writing a page that is already live
// ---------------------------------------------------------------------------

const livePage: MissingPageContent = { ...goodPage, title: "Old live title", h1: "Old live heading" };

function publishedWorld() {
  return fakeDb({
    projects: [project],
    site_connections: [{ id: "sc-1", project_id: "proj-1", kind: "hosted", site_slug: "lekki" }],
    assets: [{ id: "asset-live", project_id: "proj-1", type: "seo_page", status: "published", title: "Old live title" }],
    hosted_pages: [
      {
        id: "hp-live",
        project_id: "proj-1",
        site_slug: "lekki",
        slug: "emergency-plumbing-near-me",
        title: "Old live title",
        meta_description: livePage.metaDescription,
        page: livePage,
        template: "local",
        status: "published",
        asset_id: "asset-live",
        published_at: "2026-10-01T00:00:00.000Z",
      },
    ],
    missing_page_candidates: [
      { id: "c-live", project_id: "proj-1", query: "emergency plumbing near me", kind: "update", matched_url: "https://lekki.conduikt.site/emergency-plumbing-near-me", status: "published", score: 90, hosted_page_id: "hp-live", asset_id: "asset-live" },
    ],
  });
}

const liveCandidate: CandidateRow = { id: "c-live", project_id: "proj-1", query: "emergency plumbing near me", kind: "update", matched_url: "https://lekki.conduikt.site/emergency-plumbing-near-me", status: "published", score: 90, hosted_page_id: "hp-live" };

describe("writeCandidate on a published candidate", () => {
  beforeEach(() => wordpress.mockReset());

  it("keeps the live page live and parks the new version as a pending revision", async () => {
    const { supabase, tables } = publishedWorld();
    const written = await writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: liveCandidate, deps: { build } });

    expect(written.revision).toBe(true);
    expect(written.hostedPageId).toBe("hp-live");

    const live = tables.hosted_pages.find((h) => h.id === "hp-live")!;
    expect(live.status).toBe("published");
    expect((live.page as MissingPageContent).title).toBe("Old live title");
    expect(live.asset_id).toBe("asset-live");
    // The draft is not on the (publicly readable) hosted row.
    expect(live).not.toHaveProperty("pending_page");

    expect(tables.hosted_page_revisions).toHaveLength(1);
    const pending = tables.hosted_page_revisions[0];
    expect(pending.hosted_page_id).toBe("hp-live");
    expect(pending.project_id).toBe("proj-1");
    expect((pending.page as MissingPageContent).title).toBe(goodPage.title);
    expect(pending.asset_id).toBe(written.assetId);
    expect((pending.readiness as { ready: boolean }).ready).toBe(true);

    // No second hosted row, the candidate is still live, the write was counted.
    expect(tables.hosted_pages).toHaveLength(1);
    expect(tables.missing_page_candidates[0].status).toBe("published");
    expect(tables.assets.filter((a) => a.status === "draft")).toHaveLength(1);
    expect(tables.ai_generations).toHaveLength(1);
  });

  it("fails, and leaves the live page alone, when the live row cannot be read", async () => {
    // A select error (unknown column before the migration, a transient
    // outage) must not be read as "the live row is gone" and fall through
    // to a draft upsert over the live page.
    const { supabase: real, tables } = publishedWorld();
    const failing = {
      select: () => failing,
      eq: () => failing,
      maybeSingle: async () => ({ data: null, error: { message: "column hosted_pages.nope does not exist" } }),
    };
    const supabase = { from: (table: string) => (table === "hosted_pages" ? failing : real.from(table)) } as unknown as SupabaseClient;

    await expect(writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: liveCandidate, deps: { build } })).rejects.toThrow("does not exist");

    const live = tables.hosted_pages[0];
    expect(tables.hosted_pages).toHaveLength(1);
    expect(live.status).toBe("published");
    expect((live.page as MissingPageContent).title).toBe("Old live title");
    expect(tables.hosted_page_revisions ?? []).toHaveLength(0);
    expect(tables.missing_page_candidates[0].status).toBe("published");
    expect(tables.missing_page_candidates[0].last_error).toMatch(/does not exist/);
    expect(tables.ai_generations ?? []).toHaveLength(0);
  });

  it("puts the candidate back to published when the write fails", async () => {
    const { supabase, tables } = publishedWorld();
    const failing = async (): Promise<BuildResult> => {
      throw new Error("model returned junk");
    };
    await expect(writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: liveCandidate, deps: { build: failing } })).rejects.toThrow("junk");
    expect(tables.missing_page_candidates[0].status).toBe("published");
    expect(tables.hosted_pages[0].status).toBe("published");
  });

  it("approveRevision swaps the pending version in and publishes it; discardRevision drops it", async () => {
    const { supabase, tables } = publishedWorld();
    await writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: liveCandidate, deps: { build } });

    const out = await approveRevision({ supabase, facts: factsFromProject(project), candidateId: "c-live", hostedPageId: "hp-live", target: { kind: "hosted", siteSlug: "lekki" } });
    expect(out.kind).toBe("hosted");
    expect(out.url).toBe("https://lekki.conduikt.site/emergency-plumbing-near-me");

    const live = tables.hosted_pages[0];
    expect(live.status).toBe("published");
    expect((live.page as MissingPageContent).title).toBe(goodPage.title);
    expect(live.title).toBe(goodPage.title);
    expect(tables.hosted_page_revisions).toHaveLength(0);
    const newAsset = tables.assets.find((a) => a.id === live.asset_id)!;
    expect(newAsset.status).toBe("published");
    expect(newAsset.id).not.toBe("asset-live");
    expect((tables.missing_page_candidates[0].readiness as { score: number }).score).toBe(100);
    expect(wordpress).not.toHaveBeenCalled();

    // A second rewrite replaces the pending one, then the owner keeps the live page.
    const third = async (): Promise<BuildResult> => ({ page: { ...goodPage, title: "Third version" }, usage: { inputTokens: 1, outputTokens: 1, model: "x", durationMs: 1 } });
    await writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: liveCandidate, deps: { build: third } });
    expect(tables.hosted_page_revisions).toHaveLength(1);
    expect((tables.hosted_page_revisions[0].page as MissingPageContent).title).toBe("Third version");
    await discardRevision(supabase, "hp-live");
    expect(tables.hosted_page_revisions).toHaveLength(0);
    expect((tables.hosted_pages[0].page as MissingPageContent).title).toBe(goodPage.title);
  });

  it("on a WordPress project, pushes to WordPress before swapping, and keeps the draft pending when WordPress refuses", async () => {
    const { supabase, tables } = publishedWorld();
    const written = await writeCandidate({ supabase, project, facts: factsFromProject(project), candidate: liveCandidate, deps: { build } });
    const target = { kind: "wordpress" as const, connection: { baseUrl: "https://lekki.ng", username: "olu", appPassword: "secret" } };
    const facts = factsFromProject(project);

    // 1. WordPress is down: nothing on our side moves, the owner can retry.
    wordpress.mockRejectedValueOnce(new Error("WordPress responded 401"));
    await expect(approveRevision({ supabase, facts, candidateId: "c-live", hostedPageId: "hp-live", target })).rejects.toThrow("401");
    const live = tables.hosted_pages[0];
    expect((live.page as MissingPageContent).title).toBe("Old live title");
    expect(live.asset_id).toBe("asset-live");
    expect(tables.hosted_page_revisions).toHaveLength(1);
    expect(tables.hosted_page_revisions[0].asset_id).toBe(written.assetId);
    expect(tables.assets.find((a) => a.id === written.assetId)!.status).toBe("draft");
    expect(tables.missing_page_candidates[0].status).toBe("published");

    // 2. WordPress accepts: the pending version was what went over, then the row swaps.
    wordpress.mockResolvedValueOnce({ id: 12, link: "https://lekki.ng/emergency-plumbing-near-me/", created: false });
    const out = await approveRevision({ supabase, facts, candidateId: "c-live", hostedPageId: "hp-live", target });
    expect(out.kind).toBe("wordpress");
    expect(out.url).toBe("https://lekki.ng/emergency-plumbing-near-me/");
    expect(wordpress).toHaveBeenCalledTimes(2);
    expect(wordpress.mock.calls[1][1]).toMatchObject({ slug: "emergency-plumbing-near-me", title: goodPage.title, status: "publish" });
    expect((tables.hosted_pages[0].page as MissingPageContent).title).toBe(goodPage.title);
    expect(tables.hosted_pages[0].asset_id).toBe(written.assetId);
    expect(tables.hosted_page_revisions).toHaveLength(0);
    expect(tables.assets.find((a) => a.id === written.assetId)!.status).toBe("published");
    expect(tables.missing_page_candidates[0].matched_url).toBe("https://lekki.ng/emergency-plumbing-near-me/");
  });

  it("refuses to approve when nothing is pending", async () => {
    const { supabase } = publishedWorld();
    await expect(approveRevision({ supabase, facts: factsFromProject(project), candidateId: "c-live", hostedPageId: "hp-live", target: null })).rejects.toThrow("no new draft");
  });
});
