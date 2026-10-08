"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ArrowUpRight,
} from "@/src/components/ui/lucide-icons";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

type Step = "url" | "setup" | "context" | "audit";

const STEPS: Step[] = ["url", "setup", "context", "audit"];

interface AuditProgress {
  fetching: "pending" | "running" | "done" | "error";
  analyzing: "pending" | "running" | "done" | "error";
  saving: "pending" | "running" | "done" | "error";
}

interface Question {
  id: string;
  question: string;
  multi?: boolean;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    id: "content_creation",
    question: "What are you currently using for content creation?",
    options: [
      "Nothing yet",
      "ChatGPT / Claude",
      "Jasper / Copy.ai",
      "A marketing agency",
      "In-house team",
    ],
  },
  {
    id: "active_channels",
    question: "Which channels are you actively posting on?",
    multi: true,
    options: [
      "X (Twitter)",
      "LinkedIn",
      "Email newsletter",
      "Blog",
      "None yet",
    ],
  },
  {
    id: "biggest_challenge",
    question: "What's your biggest marketing challenge right now?",
    options: [
      "Getting more traffic",
      "Converting visitors into customers",
      "Staying consistent with content",
      "Not enough time to do it all",
      "Don't know where to start",
    ],
  },
  {
    id: "gsc_status",
    question: "Is Google Search Console set up for your site?",
    options: [
      "Yes, it's connected",
      "Yes but I haven't set it up",
      "No",
      "What's Google Search Console?",
    ],
  },
  {
    id: "content_output",
    question: "How would you describe your current content output?",
    options: [
      "Zero — starting from scratch",
      "Occasional posts (less than weekly)",
      "Weekly content",
      "Daily / multiple times a week",
    ],
  },
  {
    id: "project_type",
    question: "Who is this project for?",
    options: [
      "My own product / startup",
      "A client's business",
      "My agency (multiple clients)",
      "Side project / experiment",
    ],
  },
];

export default function NewProjectPage() {
  const [step, setStep] = useState<Step>("url");
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [setupAnswers, setSetupAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [currentQ, setCurrentQ] = useState(0);
  const [auditProgress, setAuditProgress] = useState<AuditProgress>({
    fetching: "pending",
    analyzing: "pending",
    saving: "pending",
  });
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const stepIndex = STEPS.indexOf(step);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("setup");
  }

  function handleSelectOption(questionId: string, option: string, multi?: boolean) {
    setSetupAnswers((prev) => {
      if (multi) {
        const current = (prev[questionId] as string[]) || [];
        const updated = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: option };
    });
  }

  function isOptionSelected(questionId: string, option: string): boolean {
    const val = setupAnswers[questionId];
    if (Array.isArray(val)) return val.includes(option);
    return val === option;
  }

  function canAdvanceQuestion(): boolean {
    const q = QUESTIONS[currentQ];
    const val = setupAnswers[q.id];
    if (!val) return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }

  function handleSetupComplete() {
    setStep("context");
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Create the project with all collected data in a single POST
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        website_url: websiteUrl,
        description,
        onboarding_answers: setupAnswers,
        target_audience: targetAudience
          ? { personas: [targetAudience], pain_points: [] }
          : null,
        value_proposition: valueProposition || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create project");
      setErrorCode(data.code ?? "");
      setLoading(false);
      return;
    }

    const newProjectId = data.id;
    setProjectId(newProjectId);
    toast("Project created", "success");
    setStep("audit");
    setLoading(false);

    if (newProjectId && websiteUrl) {
      // Put every agent on the plan to work on the new site; the first-week
      // page shows them live. If that can't start, fall back to the audit.
      const started = await fetch("/api/onboarding/first-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: newProjectId }),
      })
        .then((r) => r.ok)
        .catch(() => false);
      if (started) {
        window.dispatchEvent(new Event("conduikt:generation"));
        router.push(`/projects/${newProjectId}/first-week`);
        return;
      }
      runAudit(newProjectId);
    } else {
      setTimeout(() => router.push(`/projects/${newProjectId}`), 1000);
    }
  }

  async function runAudit(auditProjectId?: string) {
    const pid = auditProjectId || projectId;
    setAuditProgress({
      fetching: "running",
      analyzing: "pending",
      saving: "pending",
    });

    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, url: websiteUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAuditProgress((p) => ({ ...p, fetching: "error" }));
        toast(err.error || "Audit failed", "error");
        setTimeout(() => router.push(`/projects/${pid}`), 2000);
        return;
      }

      setAuditProgress({ fetching: "done", analyzing: "done", saving: "done" });
      toast("Site audit finished", "success");
      setTimeout(() => router.push(`/projects/${pid}/audit`), 1500);
    } catch {
      setAuditProgress((p) => ({ ...p, fetching: "error" }));
      toast(
        "Failed to run audit. You can retry from the project page.",
        "error"
      );
      setTimeout(() => router.push(`/projects/${pid}`), 2000);
    }
  }

  const q = QUESTIONS[currentQ];

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="New project"
        description="Connect your website to get started"
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-3 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-body-s transition-colors ${
                step === s
                  ? "bg-accent text-white"
                  : i < stepIndex
                  ? "bg-teal-soft text-teal"
                  : "bg-surface-2 text-text-3"
              }`}
            >
              {i < stepIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-10 ${
                  i < stepIndex ? "bg-teal" : "bg-line"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Website URL */}
      {step === "url" && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">Enter your website</h2>
              <p className="text-body-s text-text-2">
                We&apos;ll create your project and check your site
              </p>
            </div>
            <form onSubmit={handleStep1} className="space-y-4">
              <Input
                label="Project name"
                placeholder="My product"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
              <Input
                label="Website URL"
                type="url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <Input
                label="Brief description (optional)"
                placeholder="What does your product do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {error && (
                <div className="rounded-lg border border-danger bg-surface-2 px-4 py-3 text-body-s text-danger">
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Marketing Setup Questionnaire */}
      {step === "setup" && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">Tell us about your marketing</h2>
              <p className="text-label text-text-3">
                Question {currentQ + 1} of {QUESTIONS.length}
              </p>
            </div>

            <div className="mb-2">
              <div className="h-1 rounded-full bg-surface-2 overflow-hidden mb-6">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQ + 1) / QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>

              <p className="text-title text-text mb-4">
                {q.question}
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {q.options.map((option) => {
                  const selected = isOptionSelected(q.id, option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        handleSelectOption(q.id, option, q.multi)
                      }
                      className={`text-left rounded-md border px-4 py-3.5 text-body transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
                        selected
                          ? "border-accent bg-accent-soft text-text"
                          : "border-line bg-surface text-text-2 hover:border-line-strong hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                            q.multi ? "rounded-sm" : "rounded-full"
                          } border transition-colors ${
                            selected
                              ? "border-accent bg-accent"
                              : "border-line-strong bg-ground"
                          }`}
                        >
                          {selected && (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                        </div>
                        {option}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (currentQ > 0) setCurrentQ(currentQ - 1);
                  else setStep("url");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {currentQ < QUESTIONS.length - 1 ? (
                <Button
                  type="button"
                  disabled={!canAdvanceQuestion()}
                  onClick={() => setCurrentQ(currentQ + 1)}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!canAdvanceQuestion()}
                  onClick={handleSetupComplete}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Marketing Context */}
      {step === "context" && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">About your business</h2>
              <p className="text-body-s text-text-2">
                Optional. It helps every agent write for your customers.
              </p>
            </div>
            <form onSubmit={handleStep3} className="space-y-4">
              <div>
                <label className="text-body-s text-text-2 block mb-1.5">
                  Who you sell to
                </label>
                <textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who is your ideal customer? e.g., SaaS founders looking to automate marketing..."
                  rows={3}
                  className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
                />
              </div>
              <div>
                <label className="text-body-s text-text-2 block mb-1.5">
                  What makes you different
                </label>
                <textarea
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="What makes your product unique? What problem does it solve?"
                  rows={3}
                  className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
                />
              </div>
              {error && (
                <div className="rounded-lg border border-danger bg-surface-2 px-4 py-3 text-body-s text-danger">
                  <p>{error}</p>
                  {errorCode === "PROJECT_LIMIT" && (
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/settings/billing">
                        Upgrade plan
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("setup")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    "Creating…"
                  ) : websiteUrl ? (
                    <>
                      Create and check my site
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Create project
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Running Audit */}
      {step === "audit" && (
        <Card className="animate-in">
          <CardContent className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 text-label text-text-3">
              {auditProgress.saving === "done" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-teal" />
                  <span className="text-teal">Done</span>
                </>
              ) : (
                <>
                  <span className="live-dot" aria-hidden />
                  Running
                </>
              )}
            </div>
            <h2 className="text-heading text-text">
              {auditProgress.saving === "done"
                ? "Audit finished"
                : "Checking your site"}
            </h2>
            <p className="mt-2 text-body text-text-2 max-w-md">
              {auditProgress.saving === "done" ? (
                "Taking you to your results…"
              ) : (
                <>
                  Checking{" "}
                  <span className="font-mono text-text">{websiteUrl}</span> for
                  search issues and things to write about.
                </>
              )}
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              {(
                [
                  { key: "fetching", label: "Fetching page content" },
                  { key: "analyzing", label: "Checking your site" },
                  { key: "saving", label: "Saving results" },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-body-s"
                >
                  <span
                    className={
                      auditProgress[item.key] === "pending"
                        ? "text-text-3"
                        : "text-text-2"
                    }
                  >
                    {item.label}
                  </span>
                  <span
                    className={
                      auditProgress[item.key] === "done"
                        ? "text-teal"
                        : auditProgress[item.key] === "running"
                        ? "text-accent"
                        : auditProgress[item.key] === "error"
                        ? "text-danger"
                        : "text-text-3"
                    }
                  >
                    {auditProgress[item.key] === "done"
                      ? "Done"
                      : auditProgress[item.key] === "running"
                      ? "Running…"
                      : auditProgress[item.key] === "error"
                      ? "Failed"
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
