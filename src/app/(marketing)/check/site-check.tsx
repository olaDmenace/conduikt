"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { normalizeAuditUrl, PENDING_AUDIT_KEY, savePendingResult } from "@/src/lib/onboarding/url";
import { AuditResult, type AuditResultData } from "@/src/components/first-week/audit-result";
import { Turnstile, turnstileOn } from "@/src/components/first-week/turnstile";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { firstWeekAgents } from "@/src/lib/first-week/plan";
import { AI_AGENT_COUNT } from "@/src/lib/ai/agents/display";
import { cn } from "@/src/lib/utils/cn";

// Public "Check my site free" (signed out). Runs the audit plus a preview
// from every agent; two previews open, the rest show their headline and
// unlock with a free account. The gate is enforced by the API — locked
// previews arrive without their items. Signed-in visitors are sent to the
// full run instead.

interface Preview {
  agentId: string;
  headline: string;
  items: string[];
  locked: boolean;
}
interface CheckResponse {
  url: string;
  audit: AuditResultData;
  previews: Preview[];
}

type Stage = "form" | "auth" | "waiting" | "running" | "result" | "error";

const STEPS = [
  { label: "Reading your homepage", after: 0 },
  { label: "Working out how you sound", after: 5 },
  { label: "Scoring your site", after: 12 },
  { label: "Asking every agent what it would do", after: 18 },
  { label: "Drafting three posts in your voice", after: 26 },
];

const AGENTS = Object.fromEntries(firstWeekAgents().map((a) => [a.id, a]));
const wrap = "mx-auto w-full max-w-[1200px] px-4 md:px-10";

export function SiteCheck() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = normalizeAuditUrl(params.get("url") ?? "");
  const [url, setUrl] = React.useState(initial ?? "");
  const [stage, setStage] = React.useState<Stage>(initial ? "auth" : "form");
  const [token, setToken] = React.useState<string | null | undefined>(undefined);
  const [data, setData] = React.useState<CheckResponse | null>(null);
  const [error, setError] = React.useState<{ text: string; limited?: boolean } | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const ran = React.useRef<string | null>(null);

  const host = (() => {
    try {
      return new URL(normalizeAuditUrl(url) ?? "").hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  // Signed in? The full run lives in the app.
  React.useEffect(() => {
    if (stage !== "auth") return;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user && initial) {
          try {
            localStorage.setItem(PENDING_AUDIT_KEY, initial);
          } catch {}
          router.replace("/onboarding/magic-audit");
        } else setStage("waiting");
      });
  }, [stage, initial, router]);

  const check = React.useCallback(async (target: string, turnstileToken: string | null) => {
    if (ran.current === target) return;
    ran.current = target;
    setStage("running");
    setElapsed(0);
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    try {
      const res = await fetch("/api/public/site-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, turnstileToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ text: body.error ?? "We couldn't check that site just now.", limited: res.status === 429 });
        setStage("error");
        ran.current = null;
        return;
      }
      setData(body as CheckResponse);
      setStage("result");
      // After sign-up the app picks the site up and starts the full run,
      // reusing this audit rather than paying for it again.
      try {
        localStorage.setItem(PENDING_AUDIT_KEY, body.url);
      } catch {}
      savePendingResult(body.url, body.audit);
    } catch {
      setError({ text: "Network problem. Check your connection and try again." });
      setStage("error");
      ran.current = null;
    } finally {
      clearInterval(timer);
    }
  }, []);

  // Run once we have an address and (if the bot check is on) a token.
  React.useEffect(() => {
    if (stage !== "waiting" || !initial || token === undefined) return;
    if (turnstileOn && !token) return;
    check(initial, token);
  }, [stage, initial, token, check]);

  const onToken = React.useCallback((t: string | null) => setToken(t), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeAuditUrl(url);
    if (!target) {
      setError({ text: "That doesn't look like a website address. Try: yourcompany.com" });
      return;
    }
    router.replace(`/check?url=${encodeURIComponent(target)}`);
    ran.current = null;
    setError(null);
    setData(null);
    setStage("auth");
  };

  const openCount = data?.previews.filter((p) => !p.locked).length ?? 0;
  const lockedCount = (data?.previews.length ?? 0) - openCount;

  return (
    <div className="pb-24">
      <section className="border-b border-line">
        <div className={cn(wrap, "space-y-5 py-12 md:py-16")}>
          <p className="text-label text-accent">Free site check</p>
          <h1 className="text-display-m text-text">
            {stage === "result" ? `Here's ${host}.` : initial ? `Checking ${host}` : "Check your site, free."}
          </h1>
          {(stage === "form" || stage === "error") && (
            <form onSubmit={submit} className="flex max-w-[640px] flex-col gap-2 sm:flex-row" noValidate>
              <div className="min-w-0 flex-1">
                <Input
                  label="Your website address"
                  hideLabel
                  size="lg"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your website address"
                  className="h-14 sm:h-12"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 sm:h-12">
                Check my site free
              </Button>
            </form>
          )}
          {stage === "waiting" && <Turnstile onToken={onToken} />}
        </div>
      </section>

      <div className={cn(wrap, "space-y-10 pt-10")}>
        {(stage === "auth" || stage === "waiting" || stage === "running") && initial && (
          <Card className="max-w-xl space-y-4">
            <p className="flex items-center gap-2 text-title text-text">
              <span className="live-dot" aria-hidden />
              {stage === "running" ? "Working on it" : turnstileOn ? "One quick check that you're human" : "Starting"}
            </p>
            <ol className="space-y-2.5" aria-live="polite">
              {STEPS.map((s, i) => {
                const active = stage === "running" && elapsed >= s.after;
                const done = stage === "running" && elapsed >= (STEPS[i + 1]?.after ?? Infinity);
                return (
                  <li key={s.label} className={cn("flex items-center gap-3 text-body-s", done ? "text-text-2" : active ? "text-text" : "text-text-3")}>
                    <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", done ? "bg-teal" : active ? "bg-accent" : "bg-line")} />
                    {s.label}
                  </li>
                );
              })}
            </ol>
            {stage === "running" && <p className="font-mono text-caption text-text-3">{elapsed}s · usually under a minute</p>}
          </Card>
        )}

        {stage === "error" && error && (
          <Card className="max-w-xl space-y-3">
            <p className="text-body text-text">{error.text}</p>
            {error.limited && (
              <Button asChild>
                <Link href="/signup">Create my free account</Link>
              </Button>
            )}
          </Card>
        )}

        {stage === "result" && data && (
          <>
            <AuditResult audit={data.audit} host={host} />

            {data.previews.length > 0 && (
              <section className="space-y-4" aria-labelledby="agents-title">
                <div className="space-y-1">
                  <h2 id="agents-title" className="text-display-s text-text">
                    What your agents would do first.
                  </h2>
                  <p className="text-body text-text-2">
                    A preview from {data.previews.length} of our {AI_AGENT_COUNT} agents, written for {host}.
                  </p>
                </div>
                <ul className="grid gap-3 md:grid-cols-2 rail:grid-cols-3">
                  {data.previews.map((p) => {
                    const agent = AGENTS[p.agentId];
                    return (
                      <li
                        key={p.agentId}
                        className={cn(
                          "hover-card hover-card-quiet flex flex-col gap-2 rounded-lg border bg-surface p-4",
                          p.locked ? "border-line" : "border-accent"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-title text-text">{agent?.name ?? p.agentId}</span>
                          <Badge variant={p.locked ? "secondary" : "success"}>{p.locked ? "Locked" : "Preview"}</Badge>
                        </div>
                        <p className="text-body-s text-text">{p.headline}</p>
                        {p.locked ? (
                          <div className="mt-auto space-y-1.5 pt-1" aria-label="Hidden until you sign up">
                            <span aria-hidden className="block h-2.5 w-11/12 rounded-full bg-line blur-[1px]" />
                            <span aria-hidden className="block h-2.5 w-3/4 rounded-full bg-line blur-[1px]" />
                            <span aria-hidden className="block h-2.5 w-5/6 rounded-full bg-line blur-[1px]" />
                          </div>
                        ) : (
                          <ul className="list-disc space-y-1 pl-5 text-body-s text-text-2 marker:text-text-3">
                            {p.items.map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="band-ink space-y-4 rounded-lg bg-ink p-6 text-ink-text md:p-10" aria-labelledby="gate-title">
              <h2 id="gate-title" className="text-display-s text-ink-text">
                {lockedCount > 0 ? `See the other ${lockedCount}, and put them to work.` : "Put these agents to work."}
              </h2>
              <p className="max-w-[640px] text-body text-ink-text-2">
                Create a free account and we&apos;ll run your agents on {host} straight away: a full site audit, keywords and a
                week of posts on the free plan, everything else as soon as you upgrade. Nothing to retype.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">Create my free account</Link>
                </Button>
                <Button asChild size="lg" variant="outline-ink">
                  <Link href="/login">I have an account</Link>
                </Button>
              </div>
              <p className="text-caption text-ink-text-3">No card needed.</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
