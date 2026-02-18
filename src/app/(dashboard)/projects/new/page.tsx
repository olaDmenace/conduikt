"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

type Step = "url" | "context" | "audit";

interface AuditProgress {
  fetching: "pending" | "running" | "done" | "error";
  analyzing: "pending" | "running" | "done" | "error";
  saving: "pending" | "running" | "done" | "error";
}

export default function NewProjectPage() {
  const [step, setStep] = useState<Step>("url");
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [auditProgress, setAuditProgress] = useState<AuditProgress>({
    fetching: "pending",
    analyzing: "pending",
    saving: "pending",
  });
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Create the project in Supabase
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        website_url: websiteUrl,
        description,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create project");
      setLoading(false);
      return;
    }

    setProjectId(data.id);
    toast("Project created successfully!", "success");
    setStep("context");
    setLoading(false);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Update project with marketing context
    if (projectId) {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_audience: targetAudience
            ? { personas: [targetAudience], pain_points: [] }
            : null,
          value_proposition: valueProposition || null,
        }),
      });
    }

    setStep("audit");
    setLoading(false);

    // Run SEO audit
    if (projectId && websiteUrl) {
      runAudit();
    } else {
      // No URL — skip audit, go to project
      setTimeout(() => router.push(`/projects/${projectId}`), 1000);
    }
  }

  async function runAudit() {
    setAuditProgress({ fetching: "running", analyzing: "pending", saving: "pending" });

    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, url: websiteUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAuditProgress((p) => ({ ...p, fetching: "error" }));
        toast(err.error || "Audit failed", "error");
        // Still redirect after a delay
        setTimeout(() => router.push(`/projects/${projectId}`), 2000);
        return;
      }

      setAuditProgress({
        fetching: "done",
        analyzing: "done",
        saving: "done",
      });

      toast("SEO audit complete!", "success");
      setTimeout(() => router.push(`/projects/${projectId}/audit`), 1500);
    } catch {
      setAuditProgress((p) => ({ ...p, fetching: "error" }));
      toast("Failed to run audit. You can retry from the project page.", "error");
      setTimeout(() => router.push(`/projects/${projectId}`), 2000);
    }
  }

  const stepIndex = ["url", "context", "audit"].indexOf(step);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="New Project"
        description="Connect your website to get started"
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-3 mb-8">
        {(["url", "context", "audit"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-medium transition-colors ${
                step === s
                  ? "bg-accent text-surface-0"
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
            {i < 2 && (
              <div
                className={`h-px w-12 ${
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
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
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

      {/* Step 2: Marketing Context */}
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
            <form onSubmit={handleStep2} className="space-y-4">
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
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("url")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : websiteUrl ? (
                    <>
                      Run Initial Audit
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Finish Setup
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Running Audit */}
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
                  <span className="text-accent">{websiteUrl}</span> for
                  SEO issues and content opportunities.
                </>
              )}
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              {(
                [
                  { key: "fetching", label: "Fetching page content" },
                  { key: "analyzing", label: "Analyzing with Claude AI" },
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
