// The loop from the reel, end to end:
//   crawl -> intents -> "you have a page?" -> searches a month -> score
//   -> store candidates -> write the best ones -> editor check -> draft
//   (or live, if the project is Hands off and has somewhere to publish).
//
// Every outside call is injectable through `deps` so the orchestration
// can be tested with a fake database and no network.

import type { SupabaseClient } from "@supabase/supabase-js";
import { crawlSite, emptyCrawl, fetchPage, type CrawledPage, type CrawlResult } from "@/src/lib/crawl/site-crawler";
import { crawlUnreachable, crawlUnreachableMessage, SITE_UNREACHABLE } from "@/src/lib/crawl/unreachable";
import { getKeywordVolumeProvider, type KeywordVolumeProvider } from "@/src/lib/integrations/keyword-volume";
import { getPublishTarget, publishDraft, publishHostedPage, publishToWordPress, resolveSiteSlug, type HostedPageRow, type PublishTarget } from "@/src/lib/hosted-pages/publish";
import { hostedPageUrl, hostedSiteUrl, pickTemplate, slugify } from "@/src/lib/hosted-pages/templates";
import { buildMissingPage, type BuildInput, type BuildResult } from "./build";
import { automationModeOf, factsFromProject, hasSomethingToCheck, NOTHING_TO_CHECK_MESSAGE, type ProjectRow } from "./facts";
import { findGaps } from "./gaps";
import { buildIntentQueriesForProject } from "./intents";
import { reviewPage, type ReviewResult } from "./review";
import { rankCandidates } from "./score";
import type { CandidateKind, MissingPageContent, ProjectFacts } from "./types";
import { getGenerationLimit, isUnlimited, normalizePlan } from "@/src/lib/plans";

/** Thrown when the project owner's plan has no generations left this period. */
export class GenerationLimitError extends Error {
  constructor(public readonly used: number, public readonly limit: number) {
    super("Generation limit reached. Upgrade your plan.");
    this.name = "GenerationLimitError";
  }
}

// Every written page is one generation against the owner's plan, exactly
// like /api/ai/generate. Fails open if the profile cannot be read (tests,
// service outages) so a quota lookup never blocks a page by accident.
// Exported for the other routes that produce content (titles).
export async function ownerQuota(supabase: SupabaseClient, projectId: string) {
  try {
    const { data: p } = await supabase.from("projects").select("user_id").eq("id", projectId).maybeSingle();
    const userId = (p as { user_id?: string } | null)?.user_id ?? null;
    if (!userId) return { userId: null, ok: true, used: 0, limit: 0 };
    const { data: prof } = await supabase.from("profiles").select("plan, generation_count").eq("id", userId).maybeSingle();
    const row = prof as { plan?: string | null; generation_count?: number | null } | null;
    const limit = getGenerationLimit(normalizePlan(row?.plan));
    const used = row?.generation_count ?? 0;
    return { userId, ok: isUnlimited(limit) || used < limit, used, limit };
  } catch {
    return { userId: null, ok: true, used: 0, limit: 0 };
  }
}

export interface RunDeps {
  crawl?: (siteUrl: string) => Promise<CrawlResult>;
  volume?: KeywordVolumeProvider;
  build?: (input: BuildInput) => Promise<BuildResult>;
  fetchExisting?: (url: string) => Promise<CrawledPage | null>;
  now?: () => Date;
}

export interface RunMissingPagesInput {
  projectId: string;
  supabase: SupabaseClient;
  mode: "nightly" | "manual";
  /** How many pages to write this run (manual max 3, nightly 1). */
  maxPages: number;
  deps?: RunDeps;
}

export interface RunMissingPagesResult {
  runId: string | null;
  pagesCrawled: number;
  queriesChecked: number;
  gapsFound: number;
  pagesWritten: number;
  pagesPublished: number;
  written: Array<{ candidateId: string; query: string; hostedPageId: string; published: boolean; url: string | null; readiness: number }>;
  error: { code: "ai_unavailable" | "generation_limit" | "nothing_to_check" | typeof SITE_UNREACHABLE | "failed"; message: string } | null;
}

export interface CandidateRow {
  id: string;
  project_id: string;
  query: string;
  kind: CandidateKind;
  matched_url: string | null;
  status: string;
  score: number;
  /** The page this candidate already has (set once written). */
  hosted_page_id?: string | null;
}

export interface PageReadiness {
  score: number;
  ready: boolean;
  fixes: string[];
  applied?: string[];
}

/**
 * A re-written version of a live page waiting for the owner's OK
 * (hosted_page_revisions, 20261117_missing_pages_revisions). It lives in
 * its own table, not on hosted_pages, because published hosted rows are
 * readable by anyone and an unapproved draft must not be.
 */
export interface PendingRevisionRow {
  id: string;
  hosted_page_id: string;
  project_id: string;
  page: MissingPageContent;
  asset_id: string | null;
  readiness: PageReadiness | null;
  created_at?: string;
  updated_at?: string;
}

/** A hosted page row plus the pending revision, the shape the Missing Pages screen reads. */
export interface HostedPageWithPending extends HostedPageRow {
  pending_page?: MissingPageContent | null;
  pending_asset_id?: string | null;
  pending_readiness?: PageReadiness | null;
  pending_at?: string | null;
}

const HOSTED_PAGE_COLUMNS = "id, project_id, site_slug, slug, title, meta_description, page, template, status, asset_id";
export const REVISION_COLUMNS = "id, hosted_page_id, project_id, page, asset_id, readiness, created_at, updated_at";

function isAiUnavailable(err: unknown): err is Error & { userMessage?: string } {
  return err instanceof Error && err.name === "AIUnavailableError";
}

/** Published hosted pages count as pages the business has. */
function hostedAsCrawled(rows: Array<{ site_slug: string; slug: string; title: string; page: MissingPageContent }>): CrawledPage[] {
  return rows.map((r) => ({
    url: hostedPageUrl(r.site_slug, r.slug),
    title: r.title,
    h1: r.page.h1,
    metaDescription: r.page.metaDescription,
    textExcerpt: `${r.page.answer} ${r.page.entitySentence}`.slice(0, 1500),
    headings: [r.page.h1, ...r.page.sections.map((s) => s.heading)],
  }));
}

export interface WriteCandidateInput {
  supabase: SupabaseClient;
  project: ProjectRow;
  facts: ProjectFacts;
  candidate: CandidateRow;
  robots?: CrawlResult["robots"] | null;
  existingPage?: CrawledPage | null;
  deps?: RunDeps;
}

export interface WriteCandidateResult {
  hostedPageId: string;
  assetId: string;
  review: ReviewResult;
  hostedPage: HostedPageRow;
  /**
   * True when the candidate was already live: the new version was parked
   * as a pending revision on the live row (see approveRevision) and the
   * public page did not change.
   */
  revision: boolean;
}

/**
 * Build one candidate's page, review it, save a draft (asset + hosted page).
 * A candidate that is already published keeps its live page: the new
 * version is stored as a pending revision for the owner to approve.
 */
export async function writeCandidate(input: WriteCandidateInput): Promise<WriteCandidateResult> {
  const { supabase, project, facts, candidate } = input;
  const deps = input.deps ?? {};
  const now = (deps.now ?? (() => new Date()))();
  const today = now.toISOString().slice(0, 10);
  const wasPublished = candidate.status === "published";
  // Where a failed write leaves the candidate: a live page stays live.
  const released = (status: "open" | "failed") => (wasPublished ? "published" : status);

  const quota = await ownerQuota(supabase, project.id);
  if (!quota.ok) {
    await supabase
      .from("missing_page_candidates")
      .update({ status: released("open"), last_error: "Generation limit reached. Upgrade your plan." })
      .eq("id", candidate.id);
    throw new GenerationLimitError(quota.used, quota.limit);
  }

  await supabase.from("missing_page_candidates").update({ status: "writing", last_error: null }).eq("id", candidate.id);

  let existing = input.existingPage ?? null;
  if (candidate.kind === "update" && !existing && candidate.matched_url) {
    existing = await (deps.fetchExisting ?? fetchPage)(candidate.matched_url);
  }

  const build = deps.build ?? buildMissingPage;
  let built: BuildResult;
  try {
    built = await build({
      facts,
      query: candidate.query,
      kind: candidate.kind,
      existingPage: existing ? { url: existing.url, title: existing.title, text: existing.textExcerpt } : null,
      direction: project.positioning_statement ?? null,
      today,
    });
  } catch (err) {
    await supabase
      .from("missing_page_candidates")
      .update({ status: released(isAiUnavailable(err) ? "open" : "failed"), last_error: err instanceof Error ? err.message : "failed" })
      .eq("id", candidate.id);
    throw err;
  }

  // From here on the candidate is "writing"; any failure must release it or
  // the write route returns 409 forever and the nightly run never retries it.
  try {
    if (wasPublished) {
      const revised = await savePendingRevision({ input, built, today, ownerId: quota.userId });
      if (revised) return revised;
      // The live row is gone (deleted by hand, confirmed by a successful
      // lookup): fall through and write a fresh draft. A failed lookup
      // throws instead, so a database error never turns into an upsert
      // of status "draft" over a page that is still live.
    }
    return await saveWrittenPage({ input, built, today, ownerId: quota.userId });
  } catch (err) {
    await supabase
      .from("missing_page_candidates")
      .update({ status: released("failed"), last_error: err instanceof Error ? err.message : "failed" })
      .eq("id", candidate.id);
    throw err;
  }
}

/** Count one written page against the project and the owner's plan. */
async function recordGeneration(supabase: SupabaseClient, projectId: string, built: BuildResult, ownerId: string | null) {
  await supabase.from("ai_generations").insert({
    project_id: projectId,
    agent_used: "missing-page",
    input_tokens: built.usage.inputTokens,
    output_tokens: built.usage.outputTokens,
    model: built.usage.model,
    duration_ms: built.usage.durationMs,
  });
  if (ownerId && typeof (supabase as { rpc?: unknown }).rpc === "function") {
    await supabase.rpc("increment_generation_count", { user_id_param: ownerId });
  }
}

/**
 * The candidate is already live. Review the new version against the live
 * page's address, save it as a draft asset and park it in
 * hosted_page_revisions; the live `page`, `status` and `asset_id` stay as
 * they are until the owner approves (approveRevision). Returns null only
 * when the lookup succeeded and the live row no longer exists; a failed
 * lookup throws.
 */
async function savePendingRevision(args: {
  input: WriteCandidateInput;
  built: BuildResult;
  today: string;
  ownerId: string | null;
}): Promise<WriteCandidateResult | null> {
  const { input, built, today, ownerId } = args;
  const { supabase, project, facts, candidate } = input;
  if (!candidate.hosted_page_id) return null;

  const { data: liveRow, error: liveError } = await supabase
    .from("hosted_pages")
    .select(HOSTED_PAGE_COLUMNS)
    .eq("id", candidate.hosted_page_id)
    .eq("project_id", project.id)
    .maybeSingle();
  if (liveError) throw new Error(liveError.message);
  if (!liveRow) return null;
  const live = liveRow as HostedPageRow;

  const serviceName = facts.services.find((s) => candidate.query.toLowerCase().includes(s.toLowerCase())) ?? null;
  const review = reviewPage({
    page: built.page,
    facts,
    robots: input.robots ?? null,
    template: live.template,
    siteUrl: hostedSiteUrl(live.site_slug),
    pageUrl: hostedPageUrl(live.site_slug, live.slug),
    serviceName,
    today,
  });
  const page = review.page;

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      project_id: project.id,
      type: "seo_page",
      title: page.title,
      content: { ...page, query: candidate.query, kind: candidate.kind, template: live.template, siteSlug: live.site_slug, slug: live.slug, revisionOf: live.id },
      status: "draft",
    })
    .select("id")
    .single();
  if (assetError || !asset) throw new Error(assetError?.message ?? "Could not save the draft");

  const readiness: PageReadiness = { score: review.score, ready: review.ready, fixes: review.fixes, applied: review.applied };
  // One pending version per live page: a second rewrite replaces the first.
  const { error: pendingError } = await supabase
    .from("hosted_page_revisions")
    .upsert({ hosted_page_id: live.id, project_id: project.id, page, asset_id: asset.id, readiness }, { onConflict: "hosted_page_id" });
  if (pendingError) throw new Error(pendingError.message);

  // The candidate stays live; the page it points at did not change.
  await supabase.from("missing_page_candidates").update({ status: "published", last_error: null }).eq("id", candidate.id);

  await recordGeneration(supabase, project.id, built, ownerId);

  return { hostedPageId: live.id, assetId: asset.id as string, review, hostedPage: live, revision: true };
}

export interface RevisionInput {
  supabase: SupabaseClient;
  facts: ProjectFacts;
  candidateId: string;
  hostedPageId: string;
  /** Where the approved version goes; null means the hosted row only. */
  target: PublishTarget | null;
}

/**
 * Swap a pending revision into the live page and publish it where the
 * live page already is. The old asset is left as it was; the new one is
 * marked published.
 *
 * Order matters: on a WordPress project the new version is pushed to the
 * customer's site first, and the live row is only swapped once that
 * succeeded. If WordPress refuses, nothing here has changed and the draft
 * stays pending, so the owner can try again without another generation.
 */
export async function approveRevision(input: RevisionInput): Promise<{ url: string; kind: PublishTarget["kind"]; review: ReviewResult }> {
  const { supabase, facts, hostedPageId, candidateId } = input;
  const { data: row, error: rowError } = await supabase.from("hosted_pages").select(HOSTED_PAGE_COLUMNS).eq("id", hostedPageId).maybeSingle();
  if (rowError) throw new Error(rowError.message);
  const live = row as HostedPageRow | null;
  if (!live) throw new Error("That page is gone");

  const { data: revisionRow, error: revisionError } = await supabase.from("hosted_page_revisions").select(REVISION_COLUMNS).eq("hosted_page_id", live.id).maybeSingle();
  if (revisionError) throw new Error(revisionError.message);
  const revision = revisionRow as PendingRevisionRow | null;
  if (!revision) throw new Error("There is no new draft waiting on this page");

  const serviceName = facts.services.find((s) => revision.page.title.toLowerCase().includes(s.toLowerCase())) ?? null;
  const review = reviewPage({
    page: revision.page,
    facts,
    template: live.template,
    siteUrl: hostedSiteUrl(live.site_slug),
    pageUrl: hostedPageUrl(live.site_slug, live.slug),
    serviceName,
  });
  if (!review.ready) {
    const err = new Error("This page is not ready for Google and AI answers yet") as Error & { review?: ReviewResult };
    err.name = "RevisionNotReadyError";
    err.review = review;
    throw err;
  }
  const page = review.page;
  const target: PublishTarget = input.target ?? { kind: "hosted", siteSlug: live.site_slug };
  const now = new Date().toISOString();

  // 1. WordPress first (see above). The hosted target needs nothing here:
  //    the row is already live, the swap below is what publishes it.
  let wordpressUrl: string | null = null;
  if (target.kind === "wordpress") {
    const { link } = await publishToWordPress(target.connection, { slug: live.slug, page, facts, template: live.template, serviceName });
    wordpressUrl = link;
  }

  // 2. Swap the new version into the live row.
  const { error: swapError } = await supabase
    .from("hosted_pages")
    .update({
      page,
      title: page.title,
      meta_description: page.metaDescription,
      asset_id: revision.asset_id ?? live.asset_id,
      ...(wordpressUrl ? { published_at: now } : {}),
    })
    .eq("id", live.id);
  if (swapError) throw new Error(swapError.message);

  // 3. The pending copy is spent. (If this fails the row already carries
  //    the same page, so approving again is harmless.)
  const { error: dropError } = await supabase.from("hosted_page_revisions").delete().eq("id", revision.id);
  if (dropError) throw new Error(dropError.message);

  let out: { kind: PublishTarget["kind"]; url: string };
  if (wordpressUrl) {
    // The hosted row stays as it was on conduikt.site; the asset is what
    // the library shows as published.
    if (revision.asset_id) await supabase.from("assets").update({ status: "published", published_at: now }).eq("id", revision.asset_id);
    out = { kind: "wordpress", url: wordpressUrl };
  } else {
    const { url } = await publishHostedPage(supabase, live.id);
    out = { kind: "hosted", url };
  }

  await supabase
    .from("missing_page_candidates")
    .update({ status: "published", matched_url: out.url, readiness: { score: review.score, ready: review.ready, fixes: review.fixes, applied: review.applied }, last_error: null })
    .eq("id", candidateId);
  return { ...out, review };
}

/** Throw away a pending revision; the live page is untouched, the draft asset stays in the library. */
export async function discardRevision(supabase: SupabaseClient, hostedPageId: string): Promise<void> {
  const { error } = await supabase.from("hosted_page_revisions").delete().eq("hosted_page_id", hostedPageId);
  if (error) throw new Error(error.message);
}

async function saveWrittenPage(args: {
  input: WriteCandidateInput;
  built: BuildResult;
  today: string;
  ownerId: string | null;
}): Promise<WriteCandidateResult> {
  const { input, built, today, ownerId } = args;
  const { supabase, project, facts, candidate } = input;

  const siteSlug = await resolveSiteSlug(supabase, project.id, project.name);
  const slug = slugify(candidate.query);

  // hosted_pages is unique on (site_slug, slug) and the nightly run writes with
  // the service role, so an upsert could re-parent another project's live page
  // if site slugs were ever reused. Refuse instead of overwriting.
  const { data: clash } = await supabase
    .from("hosted_pages")
    .select("project_id")
    .eq("site_slug", siteSlug)
    .eq("slug", slug)
    .maybeSingle();
  if (clash && clash.project_id !== project.id) {
    throw new Error(`The address /p/${siteSlug}/${slug} belongs to another project`);
  }

  const template = pickTemplate(facts.businessType, candidate.query);
  const serviceName = facts.services.find((s) => candidate.query.toLowerCase().includes(s.toLowerCase())) ?? null;
  const review = reviewPage({
    page: built.page,
    facts,
    robots: input.robots ?? null,
    template,
    siteUrl: hostedSiteUrl(siteSlug),
    pageUrl: hostedPageUrl(siteSlug, slug),
    serviceName,
    today,
  });
  const page = review.page;

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      project_id: project.id,
      type: "seo_page",
      title: page.title,
      content: { ...page, query: candidate.query, kind: candidate.kind, template, siteSlug, slug },
      status: "draft",
    })
    .select("id")
    .single();
  if (assetError || !asset) throw new Error(assetError?.message ?? "Could not save the draft");

  const { data: hosted, error: hostedError } = await supabase
    .from("hosted_pages")
    .upsert(
      {
        project_id: project.id,
        site_slug: siteSlug,
        slug,
        title: page.title,
        meta_description: page.metaDescription,
        page,
        template,
        status: "draft",
        asset_id: asset.id,
      },
      { onConflict: "site_slug,slug" }
    )
    .select("id, project_id, site_slug, slug, title, meta_description, page, template, status, asset_id")
    .single();
  if (hostedError || !hosted) throw new Error(hostedError?.message ?? "Could not save the page");

  await supabase
    .from("missing_page_candidates")
    .update({
      status: "drafted",
      asset_id: asset.id,
      hosted_page_id: hosted.id,
      readiness: { score: review.score, ready: review.ready, fixes: review.fixes, applied: review.applied },
    })
    .eq("id", candidate.id);

  await recordGeneration(supabase, project.id, built, ownerId);

  return { hostedPageId: hosted.id as string, assetId: asset.id as string, review, hostedPage: hosted as HostedPageRow, revision: false };
}

/** Publish a drafted candidate to the project's target and mark it. */
export async function publishCandidate(input: {
  supabase: SupabaseClient;
  facts: ProjectFacts;
  candidateId: string;
  hostedPage: HostedPageRow;
  target: PublishTarget;
}): Promise<{ url: string; kind: PublishTarget["kind"] }> {
  const serviceName = input.facts.services.find((s) => input.hostedPage.title.toLowerCase().includes(s.toLowerCase())) ?? null;
  const out = await publishDraft({ supabase: input.supabase, hostedPage: input.hostedPage, facts: input.facts, target: input.target, serviceName });
  await input.supabase
    .from("missing_page_candidates")
    .update({ status: "published", matched_url: out.url, match_score: 1, kind: "update" })
    .eq("id", input.candidateId);
  return out;
}

export async function runMissingPages(input: RunMissingPagesInput): Promise<RunMissingPagesResult> {
  const { projectId, supabase, mode } = input;
  const deps = input.deps ?? {};
  const maxPages = Math.max(0, Math.min(input.maxPages, mode === "manual" ? 3 : 1));
  const result: RunMissingPagesResult = { runId: null, pagesCrawled: 0, queriesChecked: 0, gapsFound: 0, pagesWritten: 0, pagesPublished: 0, written: [], error: null };

  const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (projectError || !project) throw new Error("Project not found");
  const row = project as ProjectRow;
  const facts = factsFromProject(row);

  // Nothing to read and nothing to look for: stop before a run is counted.
  if (!hasSomethingToCheck(facts)) {
    result.error = { code: "nothing_to_check", message: NOTHING_TO_CHECK_MESSAGE };
    return result;
  }

  const { data: run } = await supabase.from("missing_page_runs").insert({ project_id: projectId, mode }).select("id").single();
  result.runId = (run?.id as string) ?? null;

  const finish = async () => {
    if (!result.runId) return;
    await supabase
      .from("missing_page_runs")
      .update({
        finished_at: new Date().toISOString(),
        pages_crawled: result.pagesCrawled,
        queries_checked: result.queriesChecked,
        gaps_found: result.gapsFound,
        pages_written: result.pagesWritten,
        pages_published: result.pagesPublished,
        error: result.error ? `${result.error.code}: ${result.error.message}` : null,
      })
      .eq("id", result.runId);
  };

  try {
    // 1. What pages exist: the site, plus pages we already host for it.
    let crawl: CrawlResult = emptyCrawl();
    if (facts.websiteUrl) crawl = await (deps.crawl ?? ((u: string) => crawlSite(u)))(facts.websiteUrl);
    result.pagesCrawled = crawl.pages.length;

    // A site we could not read is not a site with no pages. Treating it as
    // one would call every search a gap and write pages the site already
    // has, so stop here: the run is recorded with the reason, no candidate
    // is touched, and the owner sees why. Hosted-only projects (no website)
    // never come this way.
    if (facts.websiteUrl && crawlUnreachable(crawl)) {
      result.error = { code: SITE_UNREACHABLE, message: crawlUnreachableMessage(crawl, facts.websiteUrl) };
      await finish();
      return result;
    }

    const { data: hostedRows } = await supabase.from("hosted_pages").select("site_slug, slug, title, page, status").eq("project_id", projectId).eq("status", "published");
    const pages = [...crawl.pages, ...hostedAsCrawled((hostedRows ?? []) as Parameters<typeof hostedAsCrawled>[0])];

    // 2. What people search for, and whether a page answers it.
    const queries = await buildIntentQueriesForProject(facts);
    result.queriesChecked = queries.length;
    const gaps = await findGaps(queries, pages);

    // 3. Searches a month, then the score.
    const provider = deps.volume ?? getKeywordVolumeProvider();
    const volumes = await provider.lookup(queries, facts.location ? { locationName: facts.location.split(",").pop()?.trim() } : {});
    const ranked = rankCandidates(gaps, volumes);
    result.gapsFound = ranked.length;

    // 4. Store every candidate, keeping the status of ones we already had.
    const { data: existingRows } = await supabase.from("missing_page_candidates").select("query, status").eq("project_id", projectId);
    const statusByQuery = new Map(((existingRows ?? []) as Array<{ query: string; status: string }>).map((r) => [r.query, r.status]));
    const nowIso = new Date().toISOString();
    const upserts = ranked.map((c) => ({
      project_id: projectId,
      query: c.query,
      kind: c.kind,
      matched_url: c.matchedUrl,
      match_score: c.matchScore,
      monthly_searches: c.monthlySearches,
      competition: c.competition,
      estimated: c.estimated,
      score: c.score,
      status: statusByQuery.get(c.query) ?? "open",
      last_seen_at: nowIso,
    }));
    let stored: CandidateRow[] = [];
    if (upserts.length > 0) {
      const { data, error } = await supabase
        .from("missing_page_candidates")
        .upsert(upserts, { onConflict: "project_id,query" })
        .select("id, project_id, query, kind, matched_url, status, score");
      if (error) throw new Error(error.message);
      stored = (data ?? []) as CandidateRow[];
    }

    // 5. Write the best open ones.
    const picks = stored
      .filter((c) => c.status === "open")
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, maxPages);
    if (picks.length === 0) {
      await finish();
      return result;
    }

    const target = await getPublishTarget(supabase, projectId);
    const handsOff = automationModeOf(row.automation_mode) === "hands_off";
    const byUrl = new Map(pages.map((p) => [p.url, p]));

    for (const candidate of picks) {
      try {
        const written = await writeCandidate({
          supabase,
          project: row,
          facts,
          candidate,
          robots: crawl.robots,
          existingPage: candidate.matched_url ? byUrl.get(candidate.matched_url) ?? null : null,
          deps,
        });
        result.pagesWritten++;
        let published = false;
        let url: string | null = null;
        if (handsOff && target && written.review.ready) {
          const out = await publishCandidate({ supabase, facts, candidateId: candidate.id, hostedPage: written.hostedPage, target });
          published = true;
          url = out.url;
          result.pagesPublished++;
        }
        result.written.push({ candidateId: candidate.id, query: candidate.query, hostedPageId: written.hostedPageId, published, url, readiness: written.review.score });
      } catch (err) {
        if (isAiUnavailable(err) || err instanceof GenerationLimitError) throw err;
        // One bad page should not stop the others; the candidate is marked failed.
        await supabase
          .from("missing_page_candidates")
          .update({ status: "failed", last_error: err instanceof Error ? err.message : "failed" })
          .eq("id", candidate.id);
      }
    }
  } catch (err) {
    if (isAiUnavailable(err)) {
      result.error = { code: "ai_unavailable", message: err.userMessage ?? err.message };
    } else if (err instanceof GenerationLimitError) {
      result.error = { code: "generation_limit", message: err.message };
    } else {
      result.error = { code: "failed", message: err instanceof Error ? err.message : "Something went wrong" };
    }
  }

  await finish();
  return result;
}
