"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Loader2,
  Sparkles,
  ArrowRight,
  Rocket,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { LinkedInCard } from "@/src/components/social/linkedin-card";
import { cn } from "@/src/lib/utils/cn";

/**
 * Magic Audit — the 60-second onboarding flow.
 *
 * Replaces the passive 5-slide modal with a single URL input that
 * produces immediate value: SEO score + 3 ready-to-post LinkedIn drafts
 * in the inferred brand voice. Users leave step 3 with something they
 * can actually publish today — the fastest activation signal we've got.
 *
 * Flow:
 *   1. URL input + Run Instant Audit
 *   2. Multi-stage progress panel while the API runs (~15-30s)
 *   3. Result: SEO card + brand voice card + 3 LinkedInCard previews +
 *      CTAs to publish or explore
 *
 * This page is intentionally OUTSIDE the normal dashboard shell so
 * it reads as a purposeful moment, not another page in the app.
 */

interface MagicAuditResponse {
  url: string;
  signal: {
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
  };
  result: {
    seoScore: number;
    seoGrade: "A" | "B" | "C" | "D" | "F";
    topIssues: string[];
    brandVoice: {
      tone: string;
      audience: string;
      valueProposition: string;
    };
    sampleLinkedInPosts: Array<{ angle: string; text: string }>;
  };
}

type Stage = "input" | "running" | "result" | "error";

// The stage strings shown in the running panel. Fixed durations aren't
// tied to actual sub-steps (the API is a single Anthropic call, not a
// pipeline) — this is deliberate progress theater to give the wait
// texture instead of a static spinner for 30 seconds. Honest labels,
// approximate timings.
const RUNNING_STEPS = [
  { label: "Fetching your homepage", after: 0 },
  { label: "Extracting your brand voice", after: 4 },
  { label: "Scoring your SEO health", after: 10 },
  { label: "Drafting 3 posts in your voice", after: 18 },
];

export default function MagicAuditPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MagicAuditResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("running");
    setElapsed(0);

    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);

    try {
      const res = await fetch("/api/onboarding/magic-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "The audit failed. Try again.");
        setStage("error");
      } else {
        setData(body);
        setStage("result");
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
      setStage("error");
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* --- INPUT --- */}
        {stage === "input" && (
          <div className="animate-in space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-muted px-3 py-1 text-caption text-accent mb-6">
                <Sparkles className="h-3 w-3" />
                <span>The 60-second audit</span>
              </div>
              <h1 className="text-hero text-text-primary mb-3">
                Show us your site.
              </h1>
              <p className="text-body text-text-secondary max-w-md mx-auto">
                Paste your URL. We&apos;ll extract your brand voice, score
                your SEO, and hand you 3 LinkedIn posts you can publish today
                — in about a minute.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-border-default bg-surface-1 p-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="magic-audit-url"
                  className="text-small text-text-secondary block mb-1.5"
                >
                  Your website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                  <input
                    id="magic-audit-url"
                    type="text"
                    inputMode="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="acme.com"
                    autoFocus
                    className="w-full rounded-lg border border-border-strong bg-surface-0 pl-9 pr-4 py-3 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  />
                </div>
                <p className="mt-1.5 text-caption text-text-tertiary">
                  We auto-prepend https:// if you leave it off.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!url.trim()}
              >
                <Sparkles className="h-4 w-4" />
                Run Instant Audit
              </Button>
            </form>

            <p className="text-center text-caption text-text-tertiary">
              You can skip and{" "}
              <Link
                href="/dashboard"
                className="text-accent hover:text-accent-hover underline underline-offset-2"
              >
                go straight to the dashboard
              </Link>
              .
            </p>
          </div>
        )}

        {/* --- RUNNING --- */}
        {stage === "running" && (
          <div className="rounded-2xl border border-border-default bg-surface-1 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <p className="text-body text-text-primary font-medium">
                Auditing {url.replace(/^https?:\/\//, "")}
              </p>
            </div>

            <ol className="space-y-3">
              {RUNNING_STEPS.map((step) => {
                const active = elapsed >= step.after;
                const done =
                  elapsed >= (RUNNING_STEPS[RUNNING_STEPS.indexOf(step) + 1]?.after ?? Infinity);
                return (
                  <li
                    key={step.label}
                    className={cn(
                      "flex items-center gap-3 text-small transition-colors",
                      done
                        ? "text-text-secondary"
                        : active
                        ? "text-text-primary"
                        : "text-text-tertiary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full shrink-0 transition-colors",
                        done
                          ? "bg-success/20"
                          : active
                          ? "bg-accent/20"
                          : "bg-surface-2"
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin text-accent" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                      )}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-6 text-center text-caption text-text-tertiary font-mono tabular-nums">
              {elapsed}s elapsed — most audits complete in 15-30 seconds
            </p>
          </div>
        )}

        {/* --- ERROR --- */}
        {stage === "error" && (
          <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center space-y-4">
            <AlertTriangle className="h-8 w-8 text-error mx-auto" />
            <p className="text-body text-text-primary font-medium">
              We couldn&apos;t audit that URL.
            </p>
            <p className="text-small text-text-secondary">{error}</p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setStage("input");
                  setError(null);
                }}
              >
                Try another URL
              </Button>
              <Button asChild>
                <Link href="/dashboard">Skip to dashboard</Link>
              </Button>
            </div>
          </div>
        )}

        {/* --- RESULT --- */}
        {stage === "result" && data && (
          <div className="animate-in space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-caption text-success mb-4">
                <CheckCircle2 className="h-3 w-3" />
                <span>Audit complete</span>
              </div>
              <h1 className="text-h1 text-text-primary mb-2">
                Here&apos;s what we found.
              </h1>
              <p className="text-body text-text-secondary">
                Everything below is yours to keep — no signup wall.
              </p>
            </div>

            {/* SEO SCORE */}
            <div className="rounded-2xl border border-border-default bg-surface-1 p-6">
              <div className="flex items-start gap-6">
                <div
                  className={cn(
                    "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-3xl font-bold",
                    data.result.seoGrade === "A" && "border-success/50 text-success bg-success/5",
                    data.result.seoGrade === "B" && "border-accent/50 text-accent bg-accent-muted",
                    data.result.seoGrade === "C" && "border-warning/50 text-warning bg-warning/5",
                    (data.result.seoGrade === "D" || data.result.seoGrade === "F") &&
                      "border-error/50 text-error bg-error/5"
                  )}
                >
                  {data.result.seoGrade}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">
                    SEO Score
                  </p>
                  <p className="text-h2 text-text-primary font-display">
                    {data.result.seoScore} / 100
                  </p>
                  <p className="text-small text-text-secondary mt-1">
                    Calibrated against modern SEO best practice.
                  </p>
                </div>
              </div>

              {data.result.topIssues.length > 0 && (
                <div className="mt-5 pt-5 border-t border-border-subtle">
                  <p className="text-caption text-text-tertiary uppercase tracking-wider mb-2">
                    Top 3 fixes
                  </p>
                  <ol className="space-y-1.5">
                    {data.result.topIssues.map((issue, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-small text-text-secondary"
                      >
                        <span className="text-accent font-mono shrink-0 mt-0.5">
                          {i + 1}.
                        </span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* BRAND VOICE */}
            <div className="rounded-2xl border border-border-default bg-surface-1 p-6">
              <p className="text-caption text-text-tertiary uppercase tracking-wider mb-3">
                Your brand voice
              </p>
              <dl className="space-y-2 text-small">
                <div>
                  <dt className="inline text-text-tertiary">Tone: </dt>
                  <dd className="inline text-text-primary">
                    {data.result.brandVoice.tone}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-text-tertiary">Audience: </dt>
                  <dd className="inline text-text-primary">
                    {data.result.brandVoice.audience}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-text-tertiary">Value promise: </dt>
                  <dd className="inline text-text-primary">
                    {data.result.brandVoice.valueProposition}
                  </dd>
                </div>
              </dl>
            </div>

            {/* SAMPLE POSTS */}
            {data.result.sampleLinkedInPosts.length > 0 && (
              <div className="space-y-4">
                <p className="text-caption text-text-tertiary uppercase tracking-wider">
                  3 posts in your voice — publish today
                </p>
                {data.result.sampleLinkedInPosts.map((post, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-caption text-accent font-medium">
                      {i + 1}. {post.angle}
                    </p>
                    <LinkedInCard text={post.text} />
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-accent/40 bg-accent-muted p-6 text-center">
              <p className="text-body text-text-primary font-medium mb-1">
                Ready to publish these?
              </p>
              <p className="text-small text-text-secondary mb-4">
                Connect LinkedIn from the dashboard — it takes 30 seconds.
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Button asChild>
                  <Link href="/settings/integrations">
                    <Rocket className="h-4 w-4" />
                    Connect LinkedIn
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/dashboard">
                    Explore Conduikt
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
