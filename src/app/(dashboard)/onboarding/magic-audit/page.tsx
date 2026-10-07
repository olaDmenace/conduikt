"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  clearPendingAudit,
  clearPendingResult,
  normalizeAuditUrl,
  readPendingAudit,
  readPendingResult,
} from "@/src/lib/onboarding/url";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card } from "@/src/components/ui/card";
import { AuditResult, type AuditResultData } from "@/src/components/first-week/audit-result";
import { FirstWeekPanel } from "@/src/components/first-week/first-week-panel";
import { useUIStore } from "@/src/stores/ui-store";
import { cn } from "@/src/lib/utils/cn";

// Signed-in "Check my site": the audit, then the first-week pack — every
// agent the plan includes runs on the site for real, the rest preview.
// If the visitor already ran the public check before signing up, that
// result is reused instead of paid for twice.

type Stage = "input" | "running" | "result" | "error";

// Progress labels for the ~30s audit call. One model call, not a pipeline:
// the labels describe what it does, the timings are approximate.
const RUNNING_STEPS = [
  { label: "Reading your homepage", after: 0 },
  { label: "Working out how you sound", after: 4 },
  { label: "Scoring your site", after: 10 },
  { label: "Drafting three posts in your voice", after: 18 },
];

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export default function MagicAuditPage() {
  const setCurrentProjectId = useUIStore((s) => s.setCurrentProjectId);
  const [stage, setStage] = useState<Stage>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResultData | null>(null);
  const [auditedUrl, setAuditedUrl] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const started = useRef(false);

  async function startFirstWeek(target: string, result: AuditResultData) {
    setPackError(null);
    const res = await fetch("/api/onboarding/first-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target, audit: result }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPackError(body.error ?? "We couldn't start your first week. Try again from the dashboard.");
      return;
    }
    setProjectId(body.projectId);
    setCurrentProjectId(body.projectId);
    // Refresh the rail: project list and plan tile.
    window.dispatchEvent(new Event("conduikt:generation"));
  }

  async function run(raw: string) {
    const target = normalizeAuditUrl(raw);
    if (!target) {
      setError("That doesn't look like a website address. Try: yourcompany.com");
      setStage("error");
      return;
    }
    setError(null);
    setAuditedUrl(target);

    const saved = readPendingResult<AuditResultData>(target);
    clearPendingResult();
    if (saved) {
      setAudit(saved);
      setStage("result");
      startFirstWeek(target, saved);
      return;
    }

    setStage("running");
    setElapsed(0);
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    try {
      const res = await fetch("/api/onboarding/magic-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "The audit failed. Try again.");
        setStage("error");
        return;
      }
      setAudit(body.result);
      setStage("result");
      startFirstWeek(target, body.result);
    } catch {
      setError("Network problem. Check your connection and try again.");
      setStage("error");
    } finally {
      clearInterval(timer);
    }
  }

  // The address typed on the homepage before signing up: start at once.
  // The ref keeps React's dev double-mount from running it twice.
  useEffect(() => {
    if (started.current) return;
    const pending = readPendingAudit();
    if (!pending) return;
    started.current = true;
    clearPendingAudit();
    setUrl(pending);
    run(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-8">
      {stage === "input" && (
        <div className="mx-auto max-w-xl space-y-6 py-8">
          <div className="space-y-2">
            <p className="text-label text-text-3">Check my site</p>
            <h1 className="text-display-s text-text">Show us your site.</h1>
            <p className="text-body text-text-2">
              We&apos;ll score it, learn how you sound, and put every agent on your plan to work on it.
            </p>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              run(url);
            }}
          >
            <div className="min-w-0 flex-1">
              <Input
                id="magic-audit-url"
                label="Your website address"
                hideLabel
                size="lg"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourcompany.com"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" disabled={!url.trim()}>
              Check my site
            </Button>
          </form>
          <p className="text-caption text-text-3">
            Or{" "}
            <Link href="/dashboard" className="hover-link underline underline-offset-2 hover:text-text">
              go straight to your dashboard
            </Link>
            .
          </p>
        </div>
      )}

      {stage === "running" && (
        <Card className="mx-auto max-w-xl space-y-5">
          <p className="flex items-center gap-2 text-title text-text">
            <span className="live-dot" aria-hidden />
            Checking {hostOf(auditedUrl)}
          </p>
          <ol className="space-y-2.5" aria-live="polite">
            {RUNNING_STEPS.map((step, i) => {
              const active = elapsed >= step.after;
              const done = elapsed >= (RUNNING_STEPS[i + 1]?.after ?? Infinity);
              return (
                <li
                  key={step.label}
                  className={cn("flex items-center gap-3 text-body-s", done ? "text-text-2" : active ? "text-text" : "text-text-3")}
                >
                  <span
                    aria-hidden
                    className={cn("h-2 w-2 shrink-0 rounded-full", done ? "bg-teal" : active ? "bg-accent" : "bg-line")}
                  />
                  {step.label}
                </li>
              );
            })}
          </ol>
          <p className="font-mono text-caption text-text-3">{elapsed}s · most checks take 20 to 40 seconds</p>
        </Card>
      )}

      {stage === "error" && (
        <Card className="mx-auto max-w-xl space-y-4">
          <p className="text-title text-text">We couldn&apos;t check that site.</p>
          <p className="text-body-s text-text-2">{error}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStage("input");
                setError(null);
              }}
            >
              Try another address
            </Button>
            <Button asChild variant="quiet">
              <Link href="/dashboard">Go to my dashboard</Link>
            </Button>
          </div>
        </Card>
      )}

      {stage === "result" && audit && (
        <>
          <header className="space-y-2">
            <p className="text-label text-text-3">Check complete</p>
            <h1 className="text-display-s text-text">Here&apos;s {hostOf(auditedUrl)}.</h1>
          </header>
          <AuditResult audit={audit} host={hostOf(auditedUrl)} />
          {packError ? (
            <Card className="space-y-3">
              <p className="text-title text-text">Your agents didn&apos;t start.</p>
              <p className="text-body-s text-text-2">{packError}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => startFirstWeek(auditedUrl, audit)}>Try again</Button>
                <Button asChild variant="outline">
                  <Link href="/settings/billing">See plans</Link>
                </Button>
              </div>
            </Card>
          ) : projectId ? (
            <FirstWeekPanel projectId={projectId} />
          ) : (
            <p className="text-body-s text-text-3" aria-live="polite">
              Putting your agents to work…
            </p>
          )}
          {projectId && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-6">
              <Button asChild>
                <Link href="/dashboard">Go to my dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings/integrations">Connect X or LinkedIn</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
