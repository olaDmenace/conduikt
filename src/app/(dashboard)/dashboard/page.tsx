"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readPendingAudit } from "@/src/lib/onboarding/url";
import { OnboardingTour } from "@/src/components/onboarding/onboarding-tour";
import { Card, InkCard } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { KpiStrip, type KpiCell } from "@/src/components/ui/kpi-strip";
import { RunRow } from "@/src/components/ui/run-row";
import { ApprovalCard } from "@/src/components/ui/approval-card";
import { Sparkline } from "@/src/components/ui/sparkline";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useUIStore } from "@/src/stores/ui-store";
import { useToast } from "@/src/components/ui/toast";
import {
  formatCount,
  percentDelta,
  pointDelta,
  statusLine,
  whenLabel,
} from "@/src/lib/dashboard/overview";
import { cn } from "@/src/lib/utils/cn";
import { DownloadReport } from "@/src/components/first-week/download-report";

// docs/DESIGN.md §Overview screen. The app home is a status surface:
// what ran, what needs you, what was learned. Every number on it comes
// from /api/dashboard/overview — no placeholders, no bare dashes.

interface Overview {
  empty: boolean;
  user: { firstName: string | null; plan: string; generationsUsed: number; generationLimit: number; onboardingCompleted: boolean };
  projects: Array<{ id: string; name: string; websiteUrl: string | null }>;
  project: { id: string; name: string; websiteUrl: string | null } | null;
  waitingCount: number;
  nextApproval: { id: string; channel: string | null; scheduledFor: string; text: string; title: string | null } | null;
  live: Array<{ id: string; type: string; label: string | null; startedAt: string }>;
  kpis?: {
    seo: { score: number; previous: number | null; at: string } | null;
    impressions: { current: number; previous: number; posts: number };
    openRate: { current: number | null; previous: number | null; delivered: number };
    nextPublish: { id: string; channel: string; scheduledFor: string; title: string | null } | null;
  };
  upcoming?: Array<{ id: string; channel: string; scheduledFor: string; title: string | null }>;
  history?: Array<{ id: string; title: string | null; type: string; status: string; created_at: string }>;
  learning?: { id: string; channel: string; hypothesis: string; confidence: number; generated_at: string } | null;
  channels?: Array<{ key: string; label: string; connected: boolean; handle: string | null; series: number[]; total: number }>;
}

const CHANNEL_LABEL: Record<string, string> = { x: "X", linkedin: "LinkedIn", facebook: "Facebook", email: "Email", tiktok: "TikTok" };
const channelName = (c: string | null) => (c ? CHANNEL_LABEL[c] ?? c : "Post");

const SUGGESTIONS = [
  { text: "Check my homepage for problems", group: "analysis" },
  { text: "Write three LinkedIn posts for this week", group: "creation" },
  { text: "Plan next month's content", group: "strategy" },
  { text: "Schedule what's ready", group: "distribution" },
];

/** Pick the picker tab a free-text request most likely belongs to. */
function groupFor(text: string): string {
  const t = text.toLowerCase();
  if (/\b(audit|check|seo|speed|competitor|convert|conversion|broken|fix)\b/.test(t)) return "analysis";
  if (/\b(plan|strategy|keyword|launch|growth|idea)\b/.test(t)) return "strategy";
  if (/\b(schedule|calendar|post it|publish)\b/.test(t)) return "distribution";
  return "creation";
}

function timeOfDay(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function shortTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const currentProjectId = useUIStore((s) => s.currentProjectId);
  const setCurrentProjectId = useUIStore((s) => s.setCurrentProjectId);
  const openAgentPicker = useUIStore((s) => s.openAgentPicker);
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [tab, setTab] = useState<"active" | "scheduled" | "history">("active");
  const [busy, setBusy] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [firstWeek, setFirstWeek] = useState<FirstWeekSummary | null>(null);
  // True once we know this project has never had a first-week run.
  const [noRunYet, setNoRunYet] = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  const load = useCallback(async () => {
    // Every sign-in path lands here. If the visitor typed their site into
    // "Check my site free" before signing up, finish that first.
    if (readPendingAudit()) {
      router.replace("/onboarding/magic-audit");
      return;
    }
    setFailed(false);
    const q = currentProjectId ? `?projectId=${currentProjectId}` : "";
    const res = await fetch(`/api/dashboard/overview${q}`, { cache: "no-store" });
    if (!res.ok) {
      setFailed(true);
      return;
    }
    const json = (await res.json()) as Overview;
    setData(json);
    if (json.project) {
      fetch(`/api/onboarding/first-week?projectId=${json.project.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => {
          setFirstWeek(s?.started ? s : null);
          setNoRunYet(!!s && !s.started);
        })
        .catch(() => setFirstWeek(null));
    }
    if (!json.user.onboardingCompleted) setShowTour(true);
    // Scope the rail to the project we are showing.
    if (json.project && json.project.id !== currentProjectId) setCurrentProjectId(json.project.id);
  }, [currentProjectId, setCurrentProjectId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data && data.live.length === 0 && data.history && data.history.length > 0 && tab === "active") setTab("history");
    // Only on first data arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project?.id]);

  async function act(action: "publish_now" | "cancel") {
    if (!data?.nextApproval) return;
    setBusy(true);
    const res = await fetch(`/api/automation/queue/${data.nextApproval.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!res.ok) {
      toast("That didn't go through. Try again.", "error");
      return;
    }
    toast(action === "publish_now" ? "Approved. Posting now." : "Skipped.", "success");
    load();
  }

  function submitPrompt(text: string, group?: string) {
    const brief = text.trim();
    if (!brief) return;
    openAgentPicker(group ?? groupFor(brief), brief);
  }

  if (failed) {
    return (
      <EmptyState
        title="We couldn't load your overview."
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (!data) return <OverviewSkeleton />;

  const name = data.user.firstName;
  const greeting = `${timeOfDay()}${name ? `, ${name}` : ""}.`;

  const promptBar = (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submitPrompt(prompt);
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            id="ask"
            label="Ask an agent"
            hideLabel
            size="lg"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should we do next? e.g. write a post about our new pricing"
          />
        </div>
        <Button type="submit" size="lg" disabled={!prompt.trim()}>
          Ask an agent
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {suggestionsFor(data).map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => submitPrompt(s.text, s.group)}
            className="h-[30px] max-w-full truncate rounded-full border border-line bg-surface px-3 text-xs text-text-2 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:border-accent hover:text-text"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );

  // First run: prompt bar and "Run your first audit" only.
  if (data.empty || !data.project || !data.kpis) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-8">
        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
        <header className="space-y-2">
          <h1 className="text-display-s text-text">{greeting}</h1>
          <p className="text-body text-text-2">Add your website and we&apos;ll check it, then plan your first week.</p>
        </header>
        <Card className="space-y-4">
          <p className="text-title text-text">Run your first audit</p>
          <p className="text-body-s text-text-2">It takes about a minute and tells us what to write about.</p>
          <Button asChild>
            <Link href="/onboarding/magic-audit">Check my site</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { kpis } = data;
  const pid = data.project.id;

  const cells: KpiCell[] = [];
  if (kpis.seo) {
    const d = kpis.seo.previous != null ? pointDelta(kpis.seo.score, kpis.seo.previous, "since last audit") : null;
    cells.push({
      label: "Site score",
      value: `${kpis.seo.score} / 100`,
      delta: d?.text,
      deltaTone: d?.tone,
      context: d ? undefined : "First audit",
    });
  } else {
    cells.push({ label: "Site score", value: "Not checked", context: "Run an audit to get a score" });
  }

  const imp = percentDelta(kpis.impressions.current, kpis.impressions.previous, "last week");
  cells.push({
    label: "Views · 7 days",
    value: formatCount(kpis.impressions.current),
    delta: imp?.text,
    deltaTone: imp?.tone,
    context:
      kpis.impressions.posts === 0
        ? "Nothing posted in the last 2 weeks"
        : `From ${kpis.impressions.posts} ${kpis.impressions.posts === 1 ? "post" : "posts"} in 14 days`,
  });

  if (kpis.openRate.current != null) {
    const d = kpis.openRate.previous != null ? pointDelta(kpis.openRate.current, kpis.openRate.previous, "vs last month") : null;
    cells.push({
      label: "Emails opened",
      value: `${kpis.openRate.current}%`,
      delta: d?.text,
      deltaTone: d?.tone,
      context: `Of ${formatCount(kpis.openRate.delivered)} delivered · 30 days`,
    });
  } else {
    cells.push({ label: "Emails opened", value: "No sends yet", context: "Nothing sent in 30 days" });
  }

  cells.push(
    kpis.nextPublish
      ? {
          label: "Next post",
          value: whenLabel(kpis.nextPublish.scheduledFor, Date.now()),
          context: `${channelName(kpis.nextPublish.channel)} · ${shortTime(kpis.nextPublish.scheduledFor)}`,
        }
      : { label: "Next post", value: "Nothing booked", context: "Your calendar is empty" }
  );

  cells.push({
    label: "Waiting for you",
    value: data.waitingCount === 0 ? "All clear" : `${data.waitingCount} ${data.waitingCount === 1 ? "draft" : "drafts"}`,
    context: data.waitingCount === 0 ? "Nothing to approve" : "Approve, edit or skip",
    ink: true,
  });

  const tabs = [
    { key: "active" as const, label: "Active", count: data.live.length },
    { key: "scheduled" as const, label: "Scheduled", count: data.upcoming?.length ?? 0 },
    { key: "history" as const, label: "History", count: data.history?.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}

      <header className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-display-s text-text">{greeting}</h1>
          <p className="text-body text-text-2">
            {statusLine(data.live.length, data.waitingCount)}{" "}
            <span className="text-text-3">· {data.project.name}</span>
          </p>
        </div>
        {promptBar}
      </header>

      <KpiStrip cells={cells} />

      {!firstWeek && noRunYet && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-label text-text-3">Your agents</p>
            <p className="text-title text-text">
              Put every agent on your plan to work on {data.project.websiteUrl ? new URL(data.project.websiteUrl).hostname.replace(/^www\./, "") : "this site"}.
            </p>
            <p className="text-body-s text-text-2">An audit, a plan and a first week of posts and emails, in a few minutes.</p>
          </div>
          <Button
            disabled={startingRun}
            onClick={async () => {
              setStartingRun(true);
              const res = await fetch("/api/onboarding/first-week", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: pid }),
              });
              setStartingRun(false);
              if (res.ok) router.push(`/projects/${pid}/first-week`);
              else toast((await res.json().catch(() => ({}))).error ?? "Your agents didn't start. Try again.", "error");
            }}
          >
            {startingRun ? "Starting…" : "Run every agent"}
          </Button>
        </Card>
      )}

      {firstWeek && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-label text-text-3">Your first week</p>
            <p className="text-title text-text">
              {firstWeek.done
                ? `${firstWeek.counts.done} agents finished their first run on ${firstWeek.host}.`
                : `${firstWeek.counts.done} of ${firstWeek.counts.done + firstWeek.counts.running + firstWeek.counts.queued + firstWeek.counts.failed} agents finished. The rest are working.`}
              {firstWeek.counts.locked > 0 ? ` ${firstWeek.counts.locked} more on a bigger plan.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button asChild variant={firstWeek.done ? "outline" : "primary"}>
              <Link href={`/projects/${pid}/first-week`}>See their work</Link>
            </Button>
            {firstWeek.done && (
              <DownloadReport
                href={`/api/onboarding/first-week/pdf?projectId=${pid}`}
                filename={`conduikt-${firstWeek.host}-first-week.pdf`}
                variant="quiet"
              />
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-6 rail:grid-cols-[3fr_2fr]">
        {/* Runs */}
        <Card className="self-start p-0 md:p-0">
          <div role="tablist" aria-label="Runs" className="flex gap-1 px-4 pt-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-8 rounded-md px-3 text-[13px] transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)]",
                  tab === t.key ? "bg-ink text-ink-text" : "text-text-2 hover:bg-surface-2"
                )}
              >
                {t.label} · {t.count}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="mt-4">
            {tab === "active" &&
              (data.live.length > 0 ? (
                data.live.map((r) => (
                  <RunRow key={r.id} live time="" title={r.label ?? runTypeLabel(r.type)} sub={`Started ${shortTime(r.startedAt)}`} />
                ))
              ) : (
                <p className="border-t border-line px-4 py-6 text-body-s text-text-3">Nothing running right now.</p>
              ))}
            {tab === "scheduled" &&
              ((data.upcoming?.length ?? 0) > 0 ? (
                data.upcoming!.map((p) => (
                  <RunRow
                    key={p.id}
                    time={shortTime(p.scheduledFor)}
                    title={p.title ?? `${channelName(p.channel)} post`}
                    sub={`${channelName(p.channel)} · ${whenLabel(p.scheduledFor, Date.now())}`}
                    action={
                      <Button size="sm" variant="quiet" asChild>
                        <Link href={`/projects/${pid}/calendar`}>Open</Link>
                      </Button>
                    }
                  />
                ))
              ) : (
                <p className="border-t border-line px-4 py-6 text-body-s text-text-3">
                  Nothing scheduled.{" "}
                  <Link href={`/projects/${pid}/calendar`} className="hover-link text-accent hover:text-accent-hover">
                    Open the calendar
                  </Link>
                </p>
              ))}
            {tab === "history" &&
              ((data.history?.length ?? 0) > 0 ? (
                data.history!.map((a) => (
                  <RunRow
                    key={a.id}
                    time={shortTime(a.created_at)}
                    title={a.title ?? a.type.replace(/_/g, " ")}
                    sub={`${a.type.replace(/_/g, " ")} · ${a.status}`}
                    action={
                      <Button size="sm" variant="quiet" asChild>
                        <Link href={`/projects/${pid}/assets`}>View</Link>
                      </Button>
                    }
                  />
                ))
              ) : (
                <p className="border-t border-line px-4 py-6 text-body-s text-text-3">Nothing made yet. Ask an agent above.</p>
              ))}
          </div>
        </Card>

        {/* Next approval + latest learning */}
        <div className="space-y-6">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-title text-text">Next for your OK</h2>
              {data.waitingCount > 1 && (
                <Link href="/automation/queue" className="hover-link text-body-s text-text-2 hover:text-text">
                  All {data.waitingCount}
                </Link>
              )}
            </div>
            {data.nextApproval ? (
              <ApprovalCard
                channel={channelName(data.nextApproval.channel)}
                when={whenLabel(data.nextApproval.scheduledFor, Date.now())}
                text={data.nextApproval.text || data.nextApproval.title || "(This draft has no text yet.)"}
                busy={busy}
                onApprove={() => act("publish_now")}
                onEdit={() => (window.location.href = "/automation/queue")}
                onTryAgain={() => act("cancel")}
                tryAgainLabel="Skip"
              />
            ) : (
              <p className="text-body-s text-text-3">Nothing is waiting for you.</p>
            )}
          </Card>

          {data.learning ? (
            <InkCard className="space-y-2">
              <p className="text-label text-ink-text-3">
                What we learned · {channelName(data.learning.channel)}
              </p>
              <p className="text-body text-ink-text">{data.learning.hypothesis}</p>
              <p className="text-caption text-ink-text-3">
                {Math.round(Number(data.learning.confidence) * 100)}% sure ·{" "}
                <Link href={`/projects/${pid}/learnings`} className="hover-link underline-offset-2 hover:text-ink-text hover:underline">
                  See all
                </Link>
              </p>
            </InkCard>
          ) : (
            <InkCard className="space-y-2">
              <p className="text-label text-ink-text-3">What we learned</p>
              <p className="text-body-s text-ink-text-2">
                After a few posts go out we compare what worked and tell you here.
              </p>
            </InkCard>
          )}
        </div>
      </div>

      {/* Channel health */}
      <section aria-labelledby="channels" className="space-y-3">
        <h2 id="channels" className="text-label text-text-3">
          Channels
        </h2>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 rail:grid-cols-4">
          {(data.channels ?? []).map((c) => (
            <div key={c.key} className="flex min-h-[112px] flex-col justify-between gap-3 bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-title text-text">{c.label}</span>
                <Badge variant={c.connected ? "success" : "secondary"}>{c.connected ? "Connected" : "Not connected"}</Badge>
              </div>
              {c.connected ? (
                c.series.length > 1 && c.total > 0 ? (
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-caption text-text-3">{formatCount(c.total)} views · 14 days</span>
                    <Sparkline values={c.series} width={96} label={`${c.label}: ${c.total} views over 14 days`} />
                  </div>
                ) : (
                  <span className="text-caption text-text-3">
                    {c.handle ? `@${c.handle.replace(/^@/, "")} · ` : ""}
                    {c.key === "email" ? `${formatCount(c.total)} delivered · 30 days` : c.key === "gsc" ? "Search data syncs daily" : "No views in 14 days"}
                  </span>
                )
              ) : (
                <Link
                  href={c.key === "email" ? `/projects/${pid}/audiences` : "/settings/integrations"}
                  className="hover-link text-body-s text-accent hover:text-accent-hover"
                >
                  {c.key === "email" ? "Start an email list" : "Connect"}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

interface FirstWeekSummary {
  host: string;
  done: boolean;
  counts: { done: number; running: number; queued: number; failed: number; locked: number };
}

function runTypeLabel(type: string): string {
  if (type === "first_week_agent") return "First run on your site";
  if (type === "playbook_action") return "Posting from your plan";
  if (type.startsWith("email")) return "Email sequence step";
  return type.replace(/_/g, " ");
}

/** Chips: lead with the latest learning when there is one. */
function suggestionsFor(data: Overview) {
  const list = [...SUGGESTIONS];
  if (data.learning) {
    list.unshift({ text: `Write a post that uses: ${truncate(data.learning.hypothesis, 48)}`, group: "creation" });
    list.pop();
  }
  return list;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8" aria-busy="true" aria-label="Loading your overview">
      <div className="space-y-3">
        <Skeleton className="h-11 w-80" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-[132px] w-full" />
      <div className="grid gap-6 rail:grid-cols-[3fr_2fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
