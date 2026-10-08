"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { AgentOutput } from "@/src/components/first-week/agent-output";
import { DownloadReport } from "@/src/components/first-week/download-report";
import { tierLabel, type PlanTier } from "@/src/lib/plans";
import { cn } from "@/src/lib/utils/cn";

// Live view of a project's "first week" pack: every agent the plan
// includes, running for real, and a preview of the rest. Polls until the
// pack is finished; fetches outputs only when another agent completes.

type State = "queued" | "running" | "done" | "failed" | "locked";

interface AgentRow {
  id: string;
  name: string;
  job: string;
  tier: PlanTier;
  state: State;
  output?: unknown;
  preview?: { headline: string; items: string[] } | null;
}

interface Status {
  started: boolean;
  host?: string;
  plan?: string;
  done?: boolean;
  previewsReady?: boolean;
  hasDirection?: boolean;
  counts?: { done: number; running: number; queued: number; failed: number; locked: number };
  agents?: AgentRow[];
}

const STATE_LABEL: Record<State, string> = {
  queued: "Queued",
  running: "Working",
  done: "Ready",
  failed: "Didn't finish",
  locked: "Locked",
};

const STATE_BADGE: Record<State, "secondary" | "default" | "success" | "error" | "info"> = {
  queued: "secondary",
  running: "default",
  done: "success",
  failed: "error",
  locked: "info",
};

export function FirstWeekPanel({ projectId, className }: { projectId: string; className?: string }) {
  const [status, setStatus] = React.useState<Status | null>(null);
  const [outputs, setOutputs] = React.useState<Record<string, unknown>>({});
  const [open, setOpen] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState<string | null>(null);
  const [rerun, setRerun] = React.useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  // Bumped when a new run starts so polling restarts.
  const [runNonce, setRunNonce] = React.useState(0);
  const lastDone = React.useRef(-1);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/onboarding/first-week?projectId=${projectId}`, { cache: "no-store" });
    if (!res.ok) return null;
    const s = (await res.json()) as Status;
    setStatus(s);
    const done = s.counts?.done ?? 0;
    if (done !== lastDone.current && done > 0) {
      lastDone.current = done;
      const full = await fetch(`/api/onboarding/first-week?projectId=${projectId}&include=output`, { cache: "no-store" });
      if (full.ok) {
        const f = (await full.json()) as Status;
        setOutputs(Object.fromEntries((f.agents ?? []).filter((a) => a.state === "done").map((a) => [a.id, a.output])));
      }
    }
    return s;
  }, [projectId]);

  React.useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const s = await load();
      if (stop) return;
      const finished = s?.started && s.done && s.previewsReady;
      if (!finished) timer = setTimeout(tick, s?.started ? 4000 : 2500);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [load, runNonce]);

  async function runAgain() {
    setRerun({ busy: true, note: null });
    const res = await fetch("/api/onboarding/first-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, rerun: true }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.started) {
      setRerun({ busy: false, note: body.error ?? "Your agents didn't start. Try again in a minute." });
      return;
    }
    lastDone.current = -1;
    setOutputs({});
    setOpen(null);
    setRerun({ busy: false, note: null });
    setRunNonce((n) => n + 1);
  }

  async function retry(agentId: string) {
    setRetrying(agentId);
    await fetch("/api/onboarding/first-week", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, agentId }),
    });
    setRetrying(null);
    await load();
    // Resume polling until the retried agent settles.
    const again = async () => {
      const s = await load();
      if (s && !s.done) setTimeout(again, 4000);
    };
    setTimeout(again, 4000);
  }

  if (!status || !status.started || !status.agents || !status.counts) {
    return (
      <section className={cn("space-y-3", className)} aria-busy="true">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-2 w-full" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </section>
    );
  }

  const { counts, agents } = status;
  const total = counts.done + counts.running + counts.queued + counts.failed;
  const pct = total ? Math.round(((counts.done + counts.failed) / total) * 100) : 100;
  const ran = agents.filter((a) => a.state !== "locked");
  const locked = agents.filter((a) => a.state === "locked");
  const nextTier = locked[0]?.tier;

  return (
    <section className={cn("space-y-5", className)} aria-labelledby="first-week-title">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label text-text-3">Your first week{status.host ? ` · ${status.host}` : ""}</p>
          <div className="flex flex-wrap items-start gap-2">
            {status.done && (
              <Button size="sm" variant="quiet" onClick={runAgain} disabled={rerun.busy}>
                {rerun.busy ? "Starting…" : "Run all agents again"}
              </Button>
            )}
            <DownloadReport
              href={`/api/onboarding/first-week/pdf?projectId=${projectId}`}
              filename={`conduikt-${status.host ?? "site"}-first-week.pdf`}
              label={status.done ? "Download report" : "Download what's ready"}
              size="sm"
            />
          </div>
        </div>
        <p className="text-body-s text-text-2">
          {status.hasDirection ? "Your agents are following your direction. " : "Have a brief or meeting notes? "}
          <Link
            href={`/projects/${projectId}/settings#direction`}
            className="hover-link text-accent underline-offset-2 hover:text-accent-hover hover:underline"
          >
            {status.hasDirection ? "Edit it" : "Add your direction"}
          </Link>
          {status.hasDirection ? "" : ", then run your agents again."}
        </p>
        {rerun.note && (
          <p role="status" className="text-body-s text-accent">
            {rerun.note}
          </p>
        )}
        <h2 id="first-week-title" className="text-display-s text-text">
          {status.done
            ? `${counts.done} of ${total} agents finished their work.`
            : `${total} agents are working on your site.`}
        </h2>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="First week progress"
        >
          <div className="h-full bg-teal transition-[width] duration-[var(--duration-base)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-body-s text-text-2" aria-live="polite">
          {counts.done} ready · {counts.running} working · {counts.queued} queued
          {counts.failed ? ` · ${counts.failed} didn't finish` : ""}
          {status.done ? "" : ". You can leave this page; they keep going."}
        </p>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {ran.map((a) => {
          const isOpen = open === a.id;
          const output = outputs[a.id];
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => a.state === "done" && setOpen(isOpen ? null : a.id)}
                aria-expanded={a.state === "done" ? isOpen : undefined}
                disabled={a.state !== "done"}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)]",
                  a.state === "done" ? "hover:bg-ground" : "cursor-default"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-title text-text">{a.name}</span>
                  <span className="block truncate text-body-s text-text-2">{a.job}</span>
                </span>
                {a.state === "running" && <span className="live-dot" aria-hidden />}
                <Badge variant={STATE_BADGE[a.state]}>{STATE_LABEL[a.state]}</Badge>
                {a.state === "done" && (
                  <span aria-hidden className="w-4 text-text-3">
                    {isOpen ? "−" : "+"}
                  </span>
                )}
              </button>
              {a.state === "failed" && (
                <div className="flex items-center justify-between gap-3 px-4 pb-3">
                  <p className="text-body-s text-text-3">This one hit a problem.</p>
                  <Button size="sm" variant="outline" onClick={() => retry(a.id)} disabled={retrying === a.id}>
                    {retrying === a.id ? "Starting…" : "Try again"}
                  </Button>
                </div>
              )}
              {isOpen && (
                <div className="border-t border-line bg-surface px-4 py-4">
                  {output === undefined ? <Skeleton className="h-24 w-full" /> : <AgentOutput output={output} />}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {locked.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-label text-text-3">Not on your plan yet</p>
              <p className="text-body-s text-text-2">
                A short preview from each. Upgrade and they run in full on your site.
              </p>
            </div>
            {nextTier && (
              <Button asChild size="sm">
                <Link href="/settings/billing">Unlock with {tierLabel(nextTier)}</Link>
              </Button>
            )}
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {locked.map((a) => (
              <li key={a.id} className="hover-card hover-card-quiet space-y-2 rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-title text-text">{a.name}</span>
                  <Badge variant={a.tier}>{tierLabel(a.tier)}</Badge>
                </div>
                {a.preview ? (
                  <>
                    <p className="text-body-s text-text">{a.preview.headline}</p>
                    {a.preview.items.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-5 text-body-s text-text-2 marker:text-text-3">
                        {a.preview.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : status.previewsReady ? (
                  <p className="text-body-s text-text-3">{a.job}</p>
                ) : (
                  <Skeleton className="h-10 w-full" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
