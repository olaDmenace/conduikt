"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Search, Write, CheckOne, Link as LinkIcon } from "@/src/components/ui/icons";
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
  project: { id: string; name: string; websiteUrl: string | null; businessType: string; automationMode: "check_all" | "social_runs" | "hands_off"; missingPagesEnabled: boolean; location: string | null; phone: string | null };
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
      if (!res.ok) showError(body, "The search did not finish");
      else {
        const run = body.run as { gapsFound: number; pagesWritten: number; pagesPublished: number };
        toast(`${run.gapsFound} searches you have no page for. ${run.pagesWritten} page written${run.pagesPublished ? ", put live" : ", waiting for your OK"}.`, "success");
      }
    } finally {
      setRunning(false);
      await load();
    }
  };

  const act = async (candidate: Candidate, action: "write" | "approve" | "dismiss") => {
    setBusy(`${candidate.id}:${action}`);
    try {
      const res = await fetch(`/api/projects/${projectId}/missing-pages/${candidate.id}/${action}`, { method: "POST" });
      const body = await readJson(res);
      if (!res.ok) {
        if (res.status === 422 && Array.isArray(body.fixes)) toast(`Not ready yet: ${(body.fixes as string[])[0]}`, "warning");
        else showError(body, "That did not work");
      } else if (action === "write") {
        toast("Page written. It is in Drafts, waiting for your OK.", "success");
        setSelectedDraft(body.hostedPageId as string);
      } else if (action === "approve") {
        toast(`Live at ${body.url as string}`, "success");
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

  return (
    <div className="space-y-8">
      <PageHeader title="Missing Pages" description="The searches people make that you have no page for. We write the page, check it is ready for Google and AI answers, and put it live when you say so.">
        <Button onClick={runNow} disabled={running}>
          <Search size={16} />
          {running ? "Looking..." : "Find missing pages"}
        </Button>
      </PageHeader>

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
                      <span className="font-mono text-[11px] opacity-70">{d.status === "published" ? "Live" : "Draft"} · {d.page.updatedOn}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {draft && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {draftCandidate?.readiness && (
                      <Badge variant={draftCandidate.readiness.ready ? "success" : "warning"}>
                        Ready for Google and AI answers: {draftCandidate.readiness.score} out of 100
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
                  {draftCandidate?.readiness && draftCandidate.readiness.fixes.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-body-s text-text-2">
                      {draftCandidate.readiness.fixes.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {draft.page.changes && draft.page.changes.length > 0 && (
                    <div className="rounded-md border border-line bg-ground p-3 text-body-s text-text-2">
                      <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-text-3">What changed</p>
                      <ul className="list-disc pl-5">
                        {draft.page.changes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="overflow-hidden rounded-lg border border-line">
                    <HostedPageView page={draft.page} project={{ name: data.project.name, location: data.project.location, phone: data.project.phone, websiteUrl: data.project.websiteUrl }} template={draft.template} siteHref={draft.path.replace(/\/[^/]+$/, "")} embedded />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
