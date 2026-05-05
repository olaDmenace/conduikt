"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
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
    toast("Project created successfully!", "success");
    setStep("audit");
    setLoading(false);

    if (newProjectId && websiteUrl) {
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
      toast("SEO audit complete!", "success");
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
        title="New Project"
        description="Connect your website to get started"
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-3 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-medium transition-colors ${
                step === s
                  ? "bg-gradient-to-br from-[#2F8C85] to-[#1F6B66] text-on-accent"
                  : i < stepIndex
                  ? "bg-success/20 text-success"
                  : "bg-surface-2 text-text-tertiary"
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
                  i < stepIndex ? "bg-success/40" : "bg-border-default"
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
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-accent-muted p-2">
                <Globe className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-h3">Enter your website</h2>
                <p className="text-small text-text-secondary">
                  We&apos;ll create your project and analyze your site
                </p>
              </div>
            </div>
            <form onSubmit={handleStep1} className="space-y-4">
              <Input
                label="Project name"
                placeholder="My SaaS Product"
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
                <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
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
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-accent-muted p-2">
                <ClipboardList className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-h3">Tell us about your marketing</h2>
                <p className="text-small text-text-secondary">
                  Question {currentQ + 1} of {QUESTIONS.length}
                </p>
              </div>
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

              <p className="text-body font-medium text-text-primary mb-4">
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
                      className={`text-left rounded-xl border px-4 py-3.5 text-small font-medium transition-all duration-150 ${
                        selected
                          ? "border-accent bg-accent/10 text-accent shadow-[0_0_0_1px_var(--accent)]"
                          : "border-border-default bg-surface-1 text-text-secondary hover:border-border-strong hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-${
                            q.multi ? "md" : "full"
                          } border transition-colors ${
                            selected
                              ? "border-accent bg-accent"
                              : "border-border-strong bg-surface-0"
                          }`}
                        >
                          {selected && (
                            <CheckCircle2 className="h-3 w-3 text-on-accent" />
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
                variant="secondary"
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
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-accent-muted p-2">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-h3">Marketing Context</h2>
                <p className="text-small text-text-secondary">
                  Help AI understand your business (optional)
                </p>
              </div>
            </div>
            <form onSubmit={handleStep3} className="space-y-4">
              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  Target Audience
                </label>
                <textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who is your ideal customer? e.g., SaaS founders looking to automate marketing..."
                  rows={3}
                  className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                />
              </div>
              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  Value Proposition
                </label>
                <textarea
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="What makes your product unique? What problem does it solve?"
                  rows={3}
                  className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                />
              </div>
              {error && (
                <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
                  <p>{error}</p>
                  {errorCode === "PROJECT_LIMIT" && (
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/settings/billing">
                        Upgrade Plan
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("setup")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : websiteUrl ? (
                    <>
                      Create &amp; Run Audit
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Create Project
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
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-6 relative">
              <div className="h-20 w-20 rounded-full border-2 border-accent/20 flex items-center justify-center">
                {auditProgress.saving === "done" ? (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                ) : (
                  <Loader2 className="h-8 w-8 text-accent animate-spin" />
                )}
              </div>
            </div>
            <h2 className="text-h2 text-text-primary">
              {auditProgress.saving === "done"
                ? "Audit Complete!"
                : "Running your first audit"}
            </h2>
            <p className="mt-2 text-body text-text-secondary max-w-md">
              {auditProgress.saving === "done" ? (
                "Redirecting to your audit results..."
              ) : (
                <>
                  Analyzing{" "}
                  <span className="text-accent">{websiteUrl}</span> for SEO
                  issues and content opportunities.
                </>
              )}
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              {(
                [
                  { key: "fetching", label: "Fetching page content" },
                  { key: "analyzing", label: "Analyzing your project" },
                  { key: "saving", label: "Saving results" },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-small"
                >
                  <span
                    className={
                      auditProgress[item.key] === "pending"
                        ? "text-text-tertiary"
                        : "text-text-secondary"
                    }
                  >
                    {item.label}
                  </span>
                  <span
                    className={
                      auditProgress[item.key] === "done"
                        ? "text-success"
                        : auditProgress[item.key] === "running"
                        ? "text-accent"
                        : auditProgress[item.key] === "error"
                        ? "text-error"
                        : "text-text-tertiary"
                    }
                  >
                    {auditProgress[item.key] === "done"
                      ? "Done"
                      : auditProgress[item.key] === "running"
                      ? "Running..."
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
