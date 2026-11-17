"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Write, CheckOne, Edit, Link as LinkIcon } from "@/src/components/ui/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import { HostedPageView } from "@/src/lib/hosted-pages/render";
import type { HostedTemplate, MissingPageContent } from "@/src/lib/missing-pages/types";

// Missing Pages: finds the searches you have no page for, writes the page,
// puts it live. Follows the look of the simpler project pages (learnings).

interface Candidate {
  id: string;
  query: string;
  kind: "new" | "update";
  matched_url: string | null;
  monthly_searches: number | null;
  estimated: boolean;
  score: number;
  status: "open" | "writing" | "drafted" | "published" | "dismissed" | "failed";
  hosted_page_id: string | null;
  readiness: { score: number; ready: boolean; fixes: string[]; applied?: string[] } | null;
  last_error: string | null;
}

interface Draft {
  id: string;
  site_slug: string;
  slug: string;
  title: string;
  page: MissingPageContent;
  template: HostedTemplate;
  status: "draft" | "published";
  published_at: string | null;
  path: string;
  url: string;
  /** A re-written version waiting for the owner's OK; the live page is unchanged. */
  pending_page?: MissingPageContent | null;
  pending_readiness?: { score: number; ready: boolean; fixes: string[] } | null;
  pending_at?: string | null;
}

interface TitleRow {
  url: string;
  currentTitle: string | null;
  currentH1: string | null;
  proposedTitle: string;
  proposedH1: string;
  reason: string;
  accepted: boolean;
  appliedAt?: string | null;
}

interface TitleProposal {
  assetId: string;
  createdAt: string;
  siteUrl: string;
  pagesRead: number;
  rows: TitleRow[];
}

interface Run {
  id: string;
  mode: "nightly" | "manual";
  started_at: string;
  finished_at: string | null;
  pages_crawled: number;
  gaps_found: number;
  pages_written: number;
  pages_published: number;
  error: string | null;
}

interface Overview {
  project: {
    id: string;
    name: string;
    websiteUrl: string | null;
    businessType: string;
    automationMode: "check_all" | "social_runs" | "hands_off";
    missingPagesEnabled: boolean;
    location: string | null;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    bookingUrl?: string | null;
    hasSomethingToCheck?: boolean;
    settingsPath?: string;
  };
  target: { hosted: { siteSlug: string; url: string; path: string } | null; wordpress: { baseUrl: string; username: string } | null; suggestedSiteSlug: string };
  candidates: Candidate[];
  drafts: Draft[];
  runs: Run[];
}

const HOSTED_DOMAIN = process.env.NEXT_PUBLIC_HOSTED_PAGES_DOMAIN || "conduikt.site";

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

async function readJson(res: Response): Promise<{ error?: string; code?: string; [k: string]: unknown }> {
  try {
    return (await res.json()) as { error?: string; code?: string };
  } catch {
    return { error: "Something went wrong" };
  }
}

export default function MissingPagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  // Which version of a page with a pending revision the preview shows.
  const [previewPending, setPreviewPending] = useState(false);
  const [nothingToCheck, setNothingToCheck] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/missing-pages`);
    if (res.ok) setData((await res.json()) as Overview);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const showError = (body: { error?: string; code?: string }, fallback: string) => {
    toast(body.error || fallback, body.code === "ai_unavailable" ? "warning" : "error");
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/missing-pages/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxPages: 1 }) });
      const body = await readJson(res);
      if (!res.ok) {
        if (body.code === "nothing_to_check") setNothingToCheck(body.error ?? null);
        showError(body, "The search did not finish");
      } else {
        const run = body.run as { gapsFound: number; pagesWritten: number; pagesPublished: number };
        toast(`${run.gapsFound} searches you have no page for. ${run.pagesWritten} page written${run.pagesPublished ? ", put live" : ", waiting for your OK"}.`, "success");
      }
    } finally {
      setRunning(false);
      await load();
    }
  };

  const act = async (candidate: Candidate, action: "write" | "approve" | "dismiss" | "revision" | "discard-revision") => {
    setBusy(`${candidate.id}:${action}`);
    try {
      const path = action === "discard-revision" ? "revision" : action;
      const res = await fetch(`/api/projects/${projectId}/missing-pages/${candidate.id}/${path}`, { method: action === "discard-revision" ? "DELETE" : "POST" });
      const body = await readJson(res);
      if (!res.ok) {
        if (res.status === 422 && Array.isArray(body.fixes)) toast(`Not ready yet: ${(body.fixes as string[])[0]}`, "warning");
        else showError(body, "That did not work");
      } else if (action === "write") {
        if (body.revision) {
          toast("New draft ready. The live page stays as it is until you approve the new one.", "success");
          setPreviewPending(true);
        } else {
          toast("Page written. It is in Drafts, waiting for your OK.", "success");
        }
        setSelectedDraft(body.hostedPageId as string);
      } else if (action === "approve" || action === "revision") {
        toast(`Live at ${body.url as string}`, "success");
        setPreviewPending(false);
      } else if (action === "discard-revision") {
        toast("Kept the live page. The new draft was dropped.", "info");
        setPreviewPending(false);
      }
    } finally {
      setBusy(null);
      await load();
    }
  };

  const toggleNightly = async (enabled: boolean) => {
    const res = await fetch(`/api/projects/${projectId}/missing-pages/nightly`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    if (!res.ok) showError(await readJson(res), "Could not change that");
    await load();
  };

  if (loading || !data) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading missing pages">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const candidates = data.candidates;
  const drafts = data.drafts;
  const maxScore = Math.max(1, ...candidates.map((c) => Number(c.score)));
  const draft = drafts.find((d) => d.id === selectedDraft) ?? drafts[0] ?? null;
  const draftCandidate = draft ? candidates.find((c) => c.hosted_page_id === draft.id) ?? null : null;
  const handsOff = data.project.automationMode === "hands_off";
  const lastRun = data.runs[0];
  const settingsPath = data.project.settingsPath ?? `/projects/${projectId}/settings`;
  const nothingToCheckMessage = nothingToCheck ?? (data.project.hasSomethingToCheck === false ? "Add what you offer in Settings so we know what to look for." : null);
  const hasPending = !!draft?.pending_page;
  const shownPage = hasPending && previewPending ? draft!.pending_page! : draft?.page ?? null;
  const shownReadiness = hasPending && previewPending ? draft?.pending_readiness ?? null : draftCandidate?.readiness ?? null;

  return (
    <div className="space-y-8">
      <PageHeader title="Missing Pages" description="The searches people make that you have no page for. We write the page, check it is ready for Google and AI answers, and put it live when you say so.">
        <Button onClick={runNow} disabled={running}>
          <Search size={16} />
          {running ? "Looking..." : "Find missing pages"}
        </Button>
      </PageHeader>

      {nothingToCheckMessage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
          <p className="text-body text-text">{nothingToCheckMessage}</p>
          <Button size="sm" variant="outline" asChild>
            <Link href={settingsPath}>Open Settings</Link>
          </Button>
        </div>
      )}

      {lastRun && (
        <p className="font-mono text-[12px] text-text-3">
          Last run {new Date(lastRun.started_at).toLocaleString()}: {lastRun.pages_crawled} pages read, {lastRun.gaps_found} searches with no page, {lastRun.pages_written} written
          {lastRun.error ? `. Stopped: ${lastRun.error}` : ""}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PublishTargetCard projectId={projectId} target={data.target} onChange={load} />

        <Card>
          <CardHeader>
            <CardTitle>Every night</CardTitle>
            <CardDescription>Run at 2am and put one page in Drafts waiting for your OK{handsOff ? " (or live, since you chose Hands off)" : " (or live, if you choose Hands off in settings)"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-center gap-3 text-body text-text">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={data.project.missingPagesEnabled} onChange={(e) => toggleNightly(e.target.checked)} />
              Run every night and put pages in Drafts waiting for your OK{handsOff ? ", or live, since you chose Hands off" : ""}
            </label>
            {!data.project.websiteUrl && <p className="mt-3 text-body-s text-text-3">This project has no website yet, so every search counts as missing. Pages go to your Conduikt site.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Searches you have no page for</CardTitle>
          <CardDescription>Sorted by how much they are worth to you: searches a month, how crowded, and whether the searcher wants to book.</CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <EmptyState icon={<Search size={28} />} title="Nothing yet. Press Find missing pages and we will read your site and list the searches it does not answer." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm [&_th]:pb-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-text-3 [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-3">
                <thead>
                  <tr>
                    <th className="px-3.5">Search phrase</th>
                    <th className="px-3.5">Have a page?</th>
                    <th className="px-3.5">Searches a month</th>
                    <th className="px-3.5">Worth</th>
                    <th className="px-3.5">Kind</th>
                    <th className="px-3.5">Status</th>
                    <th className="px-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className={c.status === "writing" ? "bg-accent-soft" : undefined}>
                      <td className="text-text">{c.query}</td>
                      <td>
                        {c.matched_url ? (
                          <a href={c.matched_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-hover hover:underline">
                            <LinkIcon size={14} /> {pathOf(c.matched_url)}
                          </a>
                        ) : (
                          <span className="text-text-3">No</span>
                        )}
                      </td>
                      <td className="font-mono text-text-2">{c.monthly_searches === null ? "estimate" : c.monthly_searches.toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-surface-2" aria-hidden>
                            <div className="h-full bg-teal" style={{ width: `${Math.round((Number(c.score) / maxScore) * 100)}%` }} />
                          </div>
                          <span className="font-mono text-[11px] text-text-3">{Math.round((Number(c.score) / maxScore) * 100)} out of 100</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={c.kind === "update" ? "default" : "secondary"}>{c.kind === "update" ? "Update" : "New"}</Badge>
                      </td>
                      <td>
                        <StatusChip status={c.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          {(c.status === "open" || c.status === "failed") && (
                            <Button size="sm" variant="quiet" disabled={busy !== null} onClick={() => act(c, "write")}>
                              <Write size={14} /> {busy === `${c.id}:write` ? "Writing..." : "Write this page"}
                            </Button>
                          )}
                          {c.status === "published" && (
                            <>
                              <Button size="sm" variant="quiet" onClick={() => setSelectedDraft(c.hosted_page_id)}>
                                Preview
                              </Button>
                              <Button size="sm" variant="quiet" disabled={busy !== null} onClick={() => act(c, "write")}>
                                <Write size={14} /> {busy === `${c.id}:write` ? "Writing..." : "Write it again"}
                              </Button>
                            </>
                          )}
                          {c.status === "drafted" && (
                            <>
                              <Button size="sm" variant="quiet" onClick={() => setSelectedDraft(c.hosted_page_id)}>
                                Preview
                              </Button>
                              <Button size="sm" disabled={busy !== null} onClick={() => act(c, "approve")}>
                                <CheckOne size={14} /> {busy === `${c.id}:approve` ? "Publishing..." : "Approve and publish"}
                              </Button>
                            </>
                          )}
                          {c.status !== "published" && c.status !== "writing" && (
                            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act(c, "dismiss")}>
                              Dismiss
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
          <CardDescription>What we wrote, as it will look. Approve to put it live.</CardDescription>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <EmptyState icon={<Write size={28} />} title="No pages written yet. Pick a search above and press Write this page." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedDraft(d.id)}
                      aria-current={draft?.id === d.id ? "true" : undefined}
                      className="flex w-full flex-col gap-1 px-3.5 py-3 text-left hover:bg-surface-2 aria-[current=true]:bg-ink aria-[current=true]:text-ink-text"
                    >
                      <span className="text-sm font-medium">{d.title}</span>
                      <span className="font-mono text-[11px] opacity-70">
                        {d.status === "published" ? "Live" : "Draft"} · {d.page.updatedOn}
                        {d.pending_page ? " · New draft ready" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {draft && shownPage && (
                <div className="space-y-4">
                  {hasPending && draftCandidate && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="warning">New draft ready</Badge>
                        <p className="text-body-s text-text-2">The live page has not changed. Approve the new draft to swap it in, or keep what is live.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="quiet" onClick={() => setPreviewPending((v) => !v)}>
                          {previewPending ? "Show the live page" : "Show the new draft"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act(draftCandidate, "discard-revision")}>
                          Keep the live page
                        </Button>
                        <Button size="sm" disabled={busy !== null} onClick={() => act(draftCandidate, "revision")}>
                          <CheckOne size={14} /> {busy === `${draftCandidate.id}:revision` ? "Publishing..." : "Approve the new draft"}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    {shownReadiness && (
                      <Badge variant={shownReadiness.ready ? "success" : "warning"}>
                        Ready for Google and AI answers: {shownReadiness.score} out of 100
                      </Badge>
                    )}
                    {draft.status === "published" ? (
                      <a href={draft.path} target="_blank" rel="noreferrer" className="text-sm text-accent-hover hover:underline">
                        Open the live page
                      </a>
                    ) : (
                      <span className="font-mono text-[11px] text-text-3">
                        Will live at {draft.site_slug}.{HOSTED_DOMAIN}/{draft.slug}
                      </span>
                    )}
                  </div>
                  {shownReadiness && shownReadiness.fixes.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-body-s text-text-2">
                      {shownReadiness.fixes.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {shownPage.changes && shownPage.changes.length > 0 && (
                    <div className="rounded-md border border-line bg-ground p-3 text-body-s text-text-2">
                      <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-text-3">What changed</p>
                      <ul className="list-disc pl-5">
                        {shownPage.changes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="overflow-hidden rounded-lg border border-line">
                    <HostedPageView
                      page={shownPage}
                      project={{
                        name: data.project.name,
                        location: data.project.location,
                        phone: data.project.phone,
                        websiteUrl: data.project.websiteUrl,
                        address: data.project.address ?? null,
                        city: data.project.city ?? null,
                        bookingUrl: data.project.bookingUrl ?? null,
                      }}
                      template={draft.template}
                      siteHref={draft.path.replace(/\/[^/]+$/, "")}
                      embedded
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TitlesCard projectId={projectId} websiteUrl={data.project.websiteUrl} hasWordPress={!!data.target.wordpress} settingsPath={settingsPath} />
    </div>
  );
}

function pageLabel(url: string): string {
  const p = pathOf(url);
  return p === "/" ? "Home page" : p;
}

function TitlesCard({ projectId, websiteUrl, hasWordPress, settingsPath }: { projectId: string; websiteUrl: string | null; hasWordPress: boolean; settingsPath: string }) {
  const { toast } = useToast();
  const [proposal, setProposal] = useState<TitleProposal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState<"suggest" | "apply" | null>(null);
  const [manual, setManual] = useState<Array<{ url: string; title: string; h1?: string }> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/titles`)
      .then((res) => (res.ok ? res.json() : { proposal: null }))
      .then((body: { proposal: TitleProposal | null }) => setProposal(body.proposal))
      .catch(() => setProposal(null))
      .finally(() => setLoaded(true));
  }, [projectId]);

  const suggest = async () => {
    setWorking("suggest");
    setManual(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/titles`, { method: "POST" });
      const body = await readJson(res);
      if (!res.ok) toast(body.error || "Could not read your pages", body.code === "ai_unavailable" ? "warning" : "error");
      else {
        setProposal(body.proposal as TitleProposal);
        toast(`${body.changes as number} of ${(body.proposal as TitleProposal).pagesRead} pages could have a better title.`, "success");
      }
    } finally {
      setWorking(null);
    }
  };

  const changes = (r: TitleRow) => (r.currentTitle ?? "").trim() !== r.proposedTitle.trim() || (r.currentH1 ?? "").trim() !== r.proposedH1.trim();

  const toggle = (url: string, accepted: boolean) => {
    if (!proposal) return;
    setProposal({ ...proposal, rows: proposal.rows.map((r) => (r.url === url ? { ...r, accepted } : r)) });
  };

  const acceptAll = (accepted: boolean) => {
    if (!proposal) return;
    setProposal({ ...proposal, rows: proposal.rows.map((r) => (changes(r) ? { ...r, accepted } : r)) });
  };

  const apply = async () => {
    if (!proposal) return;
    const rows = proposal.rows.filter((r) => r.accepted && !r.appliedAt).map((r) => ({ url: r.url, title: r.proposedTitle, h1: r.proposedH1 }));
    if (rows.length === 0) {
      toast("Tick the rows you want first.", "warning");
      return;
    }
    setWorking("apply");
    try {
      const res = await fetch(`/api/projects/${projectId}/titles/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: proposal.assetId, rows }) });
      const body = await readJson(res);
      if (!res.ok) toast(body.error || "Could not apply the titles", "error");
      else {
        const applied = body.applied as Array<{ url: string }>;
        const failed = body.failed as Array<{ url: string; error: string }>;
        const manualRows = body.manual as Array<{ url: string; title: string; h1?: string }>;
        if (manualRows.length > 0) {
          setManual(manualRows);
          toast(body.note as string, "info");
        } else {
          toast(`${applied.length} title${applied.length === 1 ? "" : "s"} set on WordPress${failed.length ? `, ${failed.length} could not be` : ""}.`, failed.length ? "warning" : "success");
          if (failed[0]) toast(`${pageLabel(failed[0].url)}: ${failed[0].error}`, "warning");
        }
        const refreshed = await fetch(`/api/projects/${projectId}/titles`);
        if (refreshed.ok) setProposal(((await refreshed.json()) as { proposal: TitleProposal | null }).proposal);
      }
    } finally {
      setWorking(null);
    }
  };

  const copyManual = () => {
    if (!manual) return;
    const text = manual.map((r) => `${r.url}\nTitle: ${r.title}${r.h1 ? `\nHeading: ${r.h1}` : ""}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Copied", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  const rows = proposal?.rows ?? [];
  const changed = rows.filter(changes);
  const ticked = rows.filter((r) => r.accepted && !r.appliedAt).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fix titles and headings</CardTitle>
        <CardDescription>
          We read up to 30 of your pages and suggest a title and main heading for each that says what the page answers, names you and your place, and skips slogans. Tick the ones you want, then apply them
          {hasWordPress ? " to your WordPress site." : ", or copy them to paste into your site by hand."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={suggest} disabled={working !== null || !websiteUrl}>
            <Edit size={16} />
            {working === "suggest" ? "Reading your pages..." : proposal ? "Suggest again" : "Suggest better titles"}
          </Button>
          {proposal && (
            <>
              <Button variant="quiet" size="sm" onClick={() => acceptAll(true)} disabled={changed.length === 0}>
                Tick all {changed.length}
              </Button>
              <Button onClick={apply} disabled={working !== null || ticked === 0}>
                <CheckOne size={16} />
                {working === "apply" ? "Applying..." : hasWordPress ? `Apply ${ticked} to WordPress` : `Use ${ticked} by hand`}
              </Button>
              <span className="font-mono text-[11px] text-text-3">
                {proposal.pagesRead} pages read · {new Date(proposal.createdAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>

        {!websiteUrl && (
          <p className="text-body-s text-text-3">
            This needs a website address.{" "}
            <Link href={settingsPath} className="text-accent-hover hover:underline">
              Add it in Settings
            </Link>
            .
          </p>
        )}

        {loaded && !proposal && websiteUrl && <EmptyState icon={<Edit size={28} />} title="Nothing suggested yet. Press Suggest better titles and we will read your pages." />}

        {manual && manual.length > 0 && (
          <div className="rounded-md border border-line bg-ground p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-s text-text-2">No connected site, so paste these into each page&apos;s settings by hand.</p>
              <Button size="sm" variant="outline" onClick={copyManual}>
                {copied ? "Copied" : "Copy all"}
              </Button>
            </div>
            <ul className="mt-3 space-y-2 text-body-s text-text">
              {manual.map((r) => (
                <li key={r.url} className="font-mono text-[12px]">
                  {pageLabel(r.url)}: {r.title}
                  {r.h1 ? ` · Heading: ${r.h1}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {proposal && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_th]:pb-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-text-3 [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-top">
              <thead>
                <tr>
                  <th className="px-3.5">Use it</th>
                  <th className="px-3.5">Page</th>
                  <th className="px-3.5">Now</th>
                  <th className="px-3.5">Proposed</th>
                  <th className="px-3.5">Why</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isChange = changes(r);
                  return (
                    <tr key={r.url} className={r.accepted && !r.appliedAt ? "bg-accent-soft" : undefined}>
                      <td>
                        {r.appliedAt ? (
                          <Badge variant="success">Done</Badge>
                        ) : isChange ? (
                          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={r.accepted} onChange={(e) => toggle(r.url, e.target.checked)} aria-label={`Accept the new title for ${pageLabel(r.url)}`} />
                        ) : (
                          <span className="font-mono text-[11px] text-text-3">Fine as is</span>
                        )}
                      </td>
                      <td>
                        <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-hover hover:underline">
                          <LinkIcon size={14} /> {pageLabel(r.url)}
                        </a>
                      </td>
                      <td className="max-w-[260px] text-text-2">
                        <p>{r.currentTitle ?? <span className="text-text-3">No title</span>}</p>
                        {r.currentH1 && r.currentH1 !== r.currentTitle && <p className="mt-1 text-body-s text-text-3">Heading: {r.currentH1}</p>}
                      </td>
                      <td className="max-w-[260px] text-text">
                        <p>
                          {r.proposedTitle} <span className="font-mono text-[11px] text-text-3">{r.proposedTitle.length} of 60</span>
                        </p>
                        {r.proposedH1 !== r.proposedTitle && <p className="mt-1 text-body-s text-text-2">Heading: {r.proposedH1}</p>}
                      </td>
                      <td className="max-w-[240px] text-body-s text-text-2">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }: { status: Candidate["status"] }) {
  const map: Record<Candidate["status"], { label: string; variant: "secondary" | "default" | "success" | "error" | "warning" }> = {
    open: { label: "Not written", variant: "secondary" },
    writing: { label: "Writing", variant: "default" },
    drafted: { label: "Waiting for your OK", variant: "warning" },
    published: { label: "Live", variant: "success" },
    dismissed: { label: "Dismissed", variant: "secondary" },
    failed: { label: "Failed", variant: "error" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function PublishTargetCard({ projectId, target, onChange }: { projectId: string; target: Overview["target"]; onChange: () => Promise<void> }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"hosted" | "wordpress">(target.wordpress ? "wordpress" : "hosted");
  const [siteSlug, setSiteSlug] = useState(target.hosted?.siteSlug ?? target.suggestedSiteSlug);
  const [baseUrl, setBaseUrl] = useState(target.wordpress?.baseUrl ?? "");
  const [username, setUsername] = useState(target.wordpress?.username ?? "");
  const [appPassword, setAppPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body = mode === "hosted" ? { kind: "hosted", siteSlug } : { kind: "wordpress", baseUrl, username, appPassword };
      const res = await fetch(`/api/projects/${projectId}/site-connection`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await readJson(res);
      if (!res.ok) toast(json.error || "Could not save that", "error");
      else {
        toast(mode === "hosted" ? `Pages will go live at ${siteSlug}.${HOSTED_DOMAIN}` : `Connected to WordPress as ${json.connectedAs as string}`, "success");
        setAppPassword("");
        await onChange();
      }
    } finally {
      setSaving(false);
    }
  };

  const disconnectWordPress = async () => {
    const res = await fetch(`/api/projects/${projectId}/site-connection?kind=wordpress`, { method: "DELETE" });
    if (!res.ok) toast("Could not disconnect", "error");
    else {
      setMode("hosted");
      await onChange();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where pages go live</CardTitle>
        <CardDescription>
          {target.wordpress ? `Publishing to your WordPress site at ${target.wordpress.baseUrl}.` : target.hosted ? `Publishing to ${target.hosted.siteSlug}.${HOSTED_DOMAIN}.` : "Choose where we should put pages when you approve them."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-body text-text">
            <input type="radio" name="publish-target" className="accent-[var(--accent)]" checked={mode === "hosted"} onChange={() => setMode("hosted")} />
            Host it on Conduikt at {siteSlug || "your-site"}.{HOSTED_DOMAIN}
          </label>
          <label className="flex items-center gap-2 text-body text-text">
            <input type="radio" name="publish-target" className="accent-[var(--accent)]" checked={mode === "wordpress"} onChange={() => setMode("wordpress")} />
            My WordPress site
          </label>
        </div>

        {mode === "hosted" ? (
          <Input label="Site name" value={siteSlug} onChange={(e) => setSiteSlug(e.target.value)} placeholder="Try: lekki-plumbers" hint={`Letters, numbers and dashes. Pages appear at ${siteSlug || "your-site"}.${HOSTED_DOMAIN}/the-page`} />
        ) : (
          <div className="space-y-3">
            <Input label="Your WordPress address" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Try: https://example.com" />
            <Input label="WordPress username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Try: editor" />
            <Input label="Application password" type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="From WordPress: Users, Profile, Application Passwords" hint="We test it once, keep it encrypted, and never show it again." />
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={save} disabled={saving || (mode === "wordpress" && (!baseUrl || !username || !appPassword))}>
            {saving ? "Checking..." : mode === "hosted" ? "Use this site name" : "Connect WordPress"}
          </Button>
          {target.wordpress && mode === "wordpress" && (
            <Button variant="ghost" onClick={disconnectWordPress}>
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
